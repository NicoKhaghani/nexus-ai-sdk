import { createQuote, buildTransferAuthorization, verifyProof } from "../src";

// Server quotes a Quest. The quote records the plan hash for server-side enforcement;
// it is not part of the ERC-3009 signed payload.
const quote = createQuote({
  questId: "quest-1",
  amount: "1000000", // 1 USDC
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  chainId: 8453,
  payTo: "0x000000000000000000000000000000000000dEaD", // dummy receiver (example only)
  plan: { steps: [{ id: "draft", uses: "text.generate" }] },
});

// Client builds the EIP-712 payload to sign with its wallet.
const typedData = buildTransferAuthorization(quote, "0x000000000000000000000000000000000000bEEF", { // dummy payer address (example only)
  tokenName: "USD Coin",
  tokenVersion: "2",
});

console.log("Sign this typed data with your wallet:", typedData);
console.log("verifyProof is used server-side:", typeof verifyProof);
