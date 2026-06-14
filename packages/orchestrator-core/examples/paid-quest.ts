import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { X402Facilitator, buildTransferAuthorization } from "@nexus/x402-kit";
import { createQuestRuntime, runPaidQuest } from "../src";
import { z } from "zod";

/**
 * End-to-end paid Quest:
 *   plan -> quote -> payer signs ERC-3009 authorization -> facilitator settles
 *   on-chain -> Quest executes. Execution only runs once payment clears.
 *
 * Replace the keys/RPC with real values to run against Base. As written it shows
 * the full wiring; the facilitator submits via a viem WalletClient.
 */

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// --- payer (client) ---
const payer = privateKeyToAccount((process.env.PAYER_KEY ?? `0x${"11".repeat(32)}`) as Hex);

// --- server / facilitator wallet (pays gas, relays the authorization) ---
const relayer = privateKeyToAccount((process.env.RELAYER_KEY ?? `0x${"22".repeat(32)}`) as Hex);
const relayerWallet = createWalletClient({
  account: relayer,
  chain: base,
  transport: http(process.env.RPC_URL ?? "https://mainnet.base.org"),
});

const facilitator = new X402Facilitator({
  wallet: relayerWallet,
  account: relayer,
  chain: base,
  token: { name: "USD Coin", version: "2" },
});

// --- runtime ---
const runtime = createQuestRuntime({ name: "paid-runtime", version: "0.1.0" });
runtime.defineCapability({
  key: "text.generate",
  input: z.object({ prompt: z.string() }),
  output: z.object({ text: z.string() }),
  async execute({ prompt }) {
    return { text: `Generated: ${prompt}` };
  },
});
runtime.defineQuest({
  key: "demo",
  plan: async ({ objective }) => ({
    phases: ["interpretation", "planning", "execution", "verification", "assembly", "delivered"],
    steps: [{ id: "draft", uses: "text.generate", input: { prompt: objective } }],
    deliverable: { from: "draft" },
  }),
});

if (import.meta.main) {
  const outcome = await runPaidQuest(runtime, {
    questKey: "demo",
    objective: "Paid one-pager",
    questId: `quest-${Date.now()}`,
    amount: "1000000", // 1 USDC
    asset: USDC_BASE,
    chainId: base.id,
    payTo: relayer.address,
    requestProof: async (quote) => {
      const td = buildTransferAuthorization(quote, payer.address, {
        tokenName: "USD Coin",
        tokenVersion: "2",
      });
      const signature = await payer.signTypedData({
        domain: td.domain,
        types: td.types,
        primaryType: td.primaryType,
        message: td.message,
      });
      return { questId: quote.questId, nonce: quote.nonce, from: payer.address, signature };
    },
    gate: facilitator,
  });

  console.log(outcome.paid ? `paid, tx ${outcome.txHash}` : `not paid: ${outcome.reason}`);
  if (outcome.paid) console.log("deliverable:", outcome.result.deliverable);
}
