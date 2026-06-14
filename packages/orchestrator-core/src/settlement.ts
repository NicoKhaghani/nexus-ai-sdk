import {
  createQuote,
  type CreateQuoteInput,
  type X402Proof,
  type X402Quote,
} from "@nexus/x402-kit";
import { QuestRuntime } from "./runtime";
import type { ExecutionResult, QuestPlan } from "./types";

export interface SettlementGate {
  /** verify + submit the authorization; returns whether payment cleared */
  settle: (
    quote: X402Quote,
    proof: X402Proof,
  ) => Promise<{ settled: boolean; reason?: string; txHash?: string }>;
}

export interface PaidQuestInput extends Omit<CreateQuoteInput, "plan"> {
  questKey: string;
  objective: string;
  /** obtain a signed authorization for the quote (payer signs the EIP-712 msg) */
  requestProof: (quote: X402Quote) => Promise<X402Proof>;
  gate: SettlementGate;
}

export type PaidQuestResult =
  | { paid: true; txHash?: string; quote: X402Quote; result: ExecutionResult }
  | { paid: false; reason: string; quote: X402Quote };

/**
 * Run a Quest behind a single x402 settlement:
 *   1. plan the Quest,
 *   2. quote it (the quote records the plan hash for server-side enforcement),
 *   3. obtain a signed authorization from the payer,
 *   4. settle once via the gate (facilitator),
 *   5. only then execute and assemble.
 *
 * Execution never runs unless payment cleared, and the quote is settled exactly
 * once — the core promise of the x402 model.
 */
export async function runPaidQuest(
  runtime: QuestRuntime,
  input: PaidQuestInput,
): Promise<PaidQuestResult> {
  const plan: QuestPlan = await runtime.plan(input.questKey, input.objective);

  const quote = createQuote({
    questId: input.questId,
    amount: input.amount,
    asset: input.asset,
    chainId: input.chainId,
    payTo: input.payTo,
    plan,
    ttlSeconds: input.ttlSeconds,
    now: input.now,
  });

  const proof = await input.requestProof(quote);
  const settlement = await input.gate.settle(quote, proof);
  if (!settlement.settled) {
    return { paid: false, reason: settlement.reason ?? "Settlement failed", quote };
  }

  const result = await runtime.execute(plan);
  return { paid: true, txHash: settlement.txHash, quote, result };
}
