import type { X402Quote } from "./types";

export function createQuote(input: {
  amount: string;
  asset: string;
  chain: string;
  questId: string;
  ttlSeconds?: number;
  planHash?: string;
}): X402Quote {
  const expiresAt = new Date(Date.now() + (input.ttlSeconds ?? 300) * 1000).toISOString();

  return {
    amount: input.amount,
    asset: input.asset,
    chain: input.chain,
    questId: input.questId,
    expiresAt,
    planHash: input.planHash,
  };
}
