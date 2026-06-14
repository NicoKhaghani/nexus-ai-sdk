import { describe, expect, test } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import {
  createQuote,
  buildTransferAuthorization,
  verifyProof,
  settleAuthorization,
  X402Facilitator,
  EvmAddressSchema,
  type X402Proof,
  type X402Quote,
} from "../src";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DEAD = "0x000000000000000000000000000000000000dEaD";
const BEEF = "0x000000000000000000000000000000000000bEEF";
const payer = privateKeyToAccount(`0x${"11".repeat(32)}` as Hex);
const TOKEN = { name: "USD Coin", version: "2" } as const;
const TD_OPTS = { tokenName: "USD Coin", tokenVersion: "2" } as const;

function validQuote(now = 1_000_000): X402Quote {
  return createQuote({
    questId: "quest-1",
    amount: "1000000",
    asset: USDC,
    chainId: 8453,
    payTo: DEAD,
    plan: { steps: [{ id: "draft" }] },
    ttlSeconds: 300,
    now,
  });
}

// a structurally-valid proof (valid address + 65-byte signature shape)
function shapedProof(quote: X402Quote, from = BEEF): X402Proof {
  return { questId: quote.questId, nonce: quote.nonce, from, signature: `0x${"ab".repeat(64)}1b` };
}

// a cryptographically-valid proof signed by `payer`
async function signedProof(quote: X402Quote): Promise<X402Proof> {
  const td = buildTransferAuthorization(quote, payer.address, TD_OPTS);
  const signature = await payer.signTypedData({
    domain: td.domain,
    types: td.types,
    primaryType: td.primaryType,
    message: td.message,
  });
  return { questId: quote.questId, nonce: quote.nonce, from: payer.address, signature };
}

// a malformed quote (invalid asset address) cast past the type system to mimic a bad caller
const malformedQuote = { ...validQuote(), asset: "0xPayer" } as unknown as X402Quote;
const malformedProof = { ...shapedProof(validQuote()), from: "0xPayer" } as unknown as X402Proof;

describe("EvmAddressSchema is exported and usable", () => {
  test("accepts a valid address and rejects a placeholder", () => {
    expect(EvmAddressSchema.safeParse(BEEF).success).toBe(true);
    expect(EvmAddressSchema.safeParse("0xPayer").success).toBe(false);
  });
});

describe("buildTransferAuthorization is defensive", () => {
  test("valid quote + valid from works", () => {
    const td = buildTransferAuthorization(validQuote(), BEEF, TD_OPTS);
    expect(td.message.from).toBe(BEEF);
    expect(td.message.to).toBe(DEAD);
  });
  test("rejects an invalid from", () => {
    expect(() => buildTransferAuthorization(validQuote(), "0xnope", TD_OPTS)).toThrow();
  });
  test("rejects a malformed quote", () => {
    expect(() => buildTransferAuthorization(malformedQuote, BEEF, TD_OPTS)).toThrow();
  });
});

describe("verifyProof is defensive", () => {
  test("valid quote/proof accepted (cryptographic)", async () => {
    const quote = validQuote();
    const proof = await signedProof(quote);
    const res = await verifyProof(quote, proof, { token: TOKEN, now: 1_000_100 });
    expect(res.ok).toBe(true);
  });
  test("rejects a malformed quote", async () => {
    await expect(verifyProof(malformedQuote, shapedProof(validQuote()), { now: 1_000_100 })).rejects.toThrow();
  });
  test("rejects a malformed proof", async () => {
    await expect(verifyProof(validQuote(), malformedProof, { now: 1_000_100 })).rejects.toThrow();
  });
});

describe("settleAuthorization is defensive", () => {
  const wallet = { writeContract: async () => (`0x${"cd".repeat(32)}`) as Hex };

  test("valid settlement path works", async () => {
    const quote = validQuote();
    const proof = shapedProof(quote);
    const res = await settleAuthorization(wallet, quote, proof);
    expect(res.status).toBe("success");
    expect(res.txHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
  test("rejects a malformed quote", async () => {
    await expect(settleAuthorization(wallet, malformedQuote, shapedProof(validQuote()))).rejects.toThrow();
  });
  test("rejects a malformed proof", async () => {
    await expect(settleAuthorization(wallet, validQuote(), malformedProof)).rejects.toThrow();
  });
});

describe("X402Facilitator stays defensive + replay-safe", () => {
  test("rejects a malformed proof before any on-chain call", async () => {
    const calls: unknown[] = [];
    const facilitator = new X402Facilitator({
      wallet: { writeContract: async (a: unknown) => (calls.push(a), `0x${"cd".repeat(32)}` as Hex) },
      token: TOKEN,
    });
    await expect(facilitator.settle(validQuote(), malformedProof, 1_000_100)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  test("replay protection still works with valid input", async () => {
    const quote = validQuote();
    const proof = await signedProof(quote);
    let calls = 0;
    const facilitator = new X402Facilitator({
      wallet: { writeContract: async () => (calls++, `0x${"cd".repeat(32)}` as Hex) },
      token: TOKEN,
    });
    const first = await facilitator.settle(quote, proof, 1_000_100);
    const second = await facilitator.settle(quote, proof, 1_000_100);
    expect(first.settled).toBe(true);
    expect(second.settled).toBe(false);
    expect(calls).toBe(1);
  });
});
