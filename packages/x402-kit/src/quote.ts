import { createHash, randomBytes } from "node:crypto";
import { QuoteSchema, type X402Quote } from "./types";

/** Stable JSON stringify (sorted keys) so identical plans hash identically. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

/** Deterministic 0x-prefixed 32-byte hash of the plan being paid for. */
export function planHash(plan: unknown): string {
  const digest = createHash("sha256").update(stableStringify(plan)).digest("hex");
  return `0x${digest}`;
}

/** Cryptographically random 32-byte hex nonce for the authorization. */
export function createNonce(): string {
  return `0x${randomBytes(32).toString("hex")}`;
}

export interface CreateQuoteInput {
  questId: string;
  amount: string;
  asset: string;
  chainId: number;
  payTo: string;
  plan: unknown;
  ttlSeconds?: number;
  now?: number;
}

/**
 * Build a validated x402 quote. The quote records an exact amount, payee, chain,
 * validity window, single-use nonce and the plan hash. The plan hash is NOT part
 * of the ERC-3009 signed payload (the wallet signs from/to/value/validAfter/
 * validBefore/nonce only); the server/facilitator must persist the quote and
 * enforce the plan hash during verification.
 */
export function createQuote(input: CreateQuoteInput): X402Quote {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? 300;

  const quote: X402Quote = {
    questId: input.questId,
    amount: input.amount,
    asset: input.asset,
    chainId: input.chainId,
    payTo: input.payTo,
    validAfter: now - 1,
    validBefore: now + ttl,
    nonce: createNonce(),
    planHash: planHash(input.plan),
  };

  return QuoteSchema.parse(quote);
}

/** True if `now` (unix seconds) falls inside the quote's validity window. */
export function isQuoteValid(quote: X402Quote, now = Math.floor(Date.now() / 1000)): boolean {
  return now > quote.validAfter && now < quote.validBefore;
}
