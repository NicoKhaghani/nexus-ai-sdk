import { describe, expect, test } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import {
  createQuote,
  buildTransferAuthorization,
  verifyProof,
  X402Facilitator,
  type X402Proof,
} from "../src";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const payer = privateKeyToAccount(`0x${"11".repeat(32)}` as Hex);

function quoteFixture(now = 1_000_000) {
  return createQuote({
    questId: "quest-1",
    amount: "1000000",
    asset: USDC,
    chainId: 8453,
    payTo: "0x000000000000000000000000000000000000dEaD",
    plan: { steps: [{ id: "draft" }] },
    ttlSeconds: 300,
    now,
  });
}

async function signProof(quote: ReturnType<typeof quoteFixture>): Promise<X402Proof> {
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
}

describe("verifyProof (cryptographic)", () => {
  test("recovers the real signer and accepts a genuine signature", async () => {
    const quote = quoteFixture();
    const proof = await signProof(quote);
    const result = await verifyProof(quote, proof, {
      token: { name: "USD Coin", version: "2" },
      now: 1_000_100,
    });
    expect(result.ok).toBe(true);
    expect(result.recovered?.toLowerCase()).toBe(payer.address.toLowerCase());
  });

  test("rejects a signature from a different signer", async () => {
    const quote = quoteFixture();
    const proof = await signProof(quote);
    const forged = { ...proof, from: "0x0000000000000000000000000000000000000001" };
    const result = await verifyProof(quote, forged, {
      token: { name: "USD Coin", version: "2" },
      now: 1_000_100,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/does not match/i);
  });
});

describe("X402Facilitator", () => {
  test("verifies then submits on-chain, and refuses to double-settle", async () => {
    const quote = quoteFixture();
    const proof = await signProof(quote);

    const calls: unknown[] = [];
    const wallet = {
      writeContract: async (args: unknown) => {
        calls.push(args);
        return ("0x" + "ab".repeat(32)) as Hex;
      },
    };

    const facilitator = new X402Facilitator({
      wallet,
      token: { name: "USD Coin", version: "2" },
    });

    const first = await facilitator.settle(quote, proof, 1_000_100);
    expect(first.settled).toBe(true);
    expect(calls.length).toBe(1);
    expect((calls[0] as { functionName: string }).functionName).toBe("transferWithAuthorization");

    const second = await facilitator.settle(quote, proof, 1_000_100);
    expect(second.settled).toBe(false); // nonce already settled
    expect(calls.length).toBe(1); // no second on-chain call
  });
});
