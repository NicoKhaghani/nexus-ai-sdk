import { describe, expect, test } from "bun:test";
import {
  createQuote,
  planHash,
  buildTransferAuthorization,
  verifyProof,
  isQuoteValid,
  QuoteSchema,
  ProofSchema,
  type X402Proof,
} from "../src";

const PLAN = { steps: [{ id: "draft", uses: "text.generate" }] };
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base

function quoteFixture(now = 1_000_000) {
  return createQuote({
    questId: "quest-1",
    amount: "1000000",
    asset: USDC,
    chainId: 8453,
    payTo: "0x000000000000000000000000000000000000dEaD",
    plan: PLAN,
    ttlSeconds: 300,
    now,
  });
}

describe("planHash", () => {
  test("is deterministic regardless of key order", () => {
    expect(planHash({ a: 1, b: 2 })).toBe(planHash({ b: 2, a: 1 }));
  });
  test("changes when the plan changes", () => {
    expect(planHash(PLAN)).not.toBe(planHash({ steps: [] }));
  });
});

describe("createQuote", () => {
  test("records amount, chain and plan hash; nonce is 32 bytes", () => {
    const q = quoteFixture();
    expect(q.amount).toBe("1000000");
    expect(q.chainId).toBe(8453);
    expect(q.planHash).toBe(planHash(PLAN));
    expect(q.nonce).toMatch(/^0x[0-9a-f]{64}$/);
    expect(isQuoteValid(q, 1_000_100)).toBe(true);
    expect(isQuoteValid(q, 1_000_400)).toBe(false); // past validBefore
  });
});

describe("buildTransferAuthorization", () => {
  test("produces a well-formed ERC-3009 EIP-712 payload matching the quote", () => {
    const q = quoteFixture();
    const td = buildTransferAuthorization(q, "0x000000000000000000000000000000000000bEEF", { tokenName: "USD Coin", tokenVersion: "2" });
    expect(td.primaryType).toBe("TransferWithAuthorization");
    expect(td.domain.verifyingContract).toBe(USDC);
    expect(td.domain.chainId).toBe(8453);
    expect(td.message.to).toBe(q.payTo);
    expect(td.message.value).toBe(q.amount);
    expect(td.message.nonce).toBe(q.nonce);
    expect(td.types.TransferWithAuthorization.map((f) => f.name)).toEqual([
      "from",
      "to",
      "value",
      "validAfter",
      "validBefore",
      "nonce",
    ]);
  });
});

describe("verifyProof (structural binding)", () => {
  // Cryptographic signature-recovery tests live in settle.test.ts with a real
  // signer. These cover the binding/validity checks (no `token` => no recovery).
  const validProof = (q: ReturnType<typeof quoteFixture>): X402Proof => ({
    questId: q.questId,
    nonce: q.nonce,
    from: "0x000000000000000000000000000000000000bEEF",
    signature: `0x${"ab".repeat(65)}`,
  });

  test("accepts a matching, well-formed proof inside the validity window", async () => {
    const q = quoteFixture();
    expect((await verifyProof(q, validProof(q), { now: 1_000_100 })).ok).toBe(true);
  });

  test("rejects a nonce mismatch", async () => {
    const q = quoteFixture();
    const bad = { ...validProof(q), nonce: `0x${"00".repeat(32)}` };
    expect(await verifyProof(q, bad, { now: 1_000_100 })).toMatchObject({
      ok: false,
      reason: "nonce mismatch",
    });
  });

  test("rejects an expired quote", async () => {
    const q = quoteFixture();
    expect((await verifyProof(q, validProof(q), { now: 1_000_400 })).ok).toBe(false);
  });
});

describe("EVM address validation", () => {
  const DEAD = "0x000000000000000000000000000000000000dEaD";
  const BEEF = "0x000000000000000000000000000000000000bEEF";

  test("createQuote accepts valid asset and payTo addresses", () => {
    expect(() =>
      createQuote({
        questId: "q",
        amount: "1000000",
        asset: USDC,
        chainId: 8453,
        payTo: DEAD,
        plan: PLAN,
      }),
    ).not.toThrow();
  });

  test("quote with an invalid asset is rejected", () => {
    expect(() =>
      createQuote({
        questId: "q",
        amount: "1000000",
        asset: "0xPayer",
        chainId: 8453,
        payTo: DEAD,
        plan: PLAN,
      }),
    ).toThrow();
  });

  test("quote with an invalid payTo is rejected", () => {
    expect(() =>
      createQuote({
        questId: "q",
        amount: "1000000",
        asset: USDC,
        chainId: 8453,
        payTo: "0xPayerAddress",
        plan: PLAN,
      }),
    ).toThrow();
  });

  test("QuoteSchema accepts a valid address and rejects a placeholder", () => {
    const base = {
      questId: "q",
      amount: "1000000",
      asset: USDC,
      chainId: 8453,
      payTo: DEAD,
      validAfter: 1,
      validBefore: 2,
      nonce: `0x${"00".repeat(32)}`,
      planHash: `0x${"11".repeat(32)}`,
    };
    expect(QuoteSchema.safeParse(base).success).toBe(true);
    expect(QuoteSchema.safeParse({ ...base, asset: "0xPayer" }).success).toBe(false);
  });

  test("ProofSchema rejects an invalid `from` address", () => {
    const proof = {
      questId: "q",
      nonce: `0x${"00".repeat(32)}`,
      from: "0xPayer",
      signature: `0x${"ab".repeat(65)}`,
    };
    expect(ProofSchema.safeParse(proof).success).toBe(false);
    expect(ProofSchema.safeParse({ ...proof, from: BEEF }).success).toBe(true);
  });
});
