import { settleAuthorization, type ReceiptWatcher, type SettlementWallet } from "./settle";
import { verifyProof } from "./verify";
import { ProofSchema, QuoteSchema, type X402Proof, type X402Quote } from "./types";

export interface FacilitatorConfig {
  wallet: SettlementWallet;
  receipts?: ReceiptWatcher;
  account?: unknown;
  chain?: unknown;
  token: { name: string; version: string };
}

export type SettlementOutcome =
  | { settled: true; txHash: string; recovered?: string }
  | { settled: false; reason: string };

/**
 * Server-side facilitator for x402: verifies a payment proof (including real
 * EIP-712 signature recovery) and, if valid and not already used, submits the
 * authorization on-chain. A nonce is settled at most once per facilitator
 * instance (in-memory guard; back with a store in production).
 *
 * Defensive: `quote` and `proof` are parsed with the kit's zod schemas at entry,
 * so the anti-replay key and every downstream call use validated values even if
 * the caller bypassed `createQuote()`.
 */
export class X402Facilitator {
  private readonly settledNonces = new Set<string>();

  constructor(private readonly config: FacilitatorConfig) {}

  async settle(quote: X402Quote, proof: X402Proof, now?: number): Promise<SettlementOutcome> {
    const safeQuote = QuoteSchema.parse(quote);
    const safeProof = ProofSchema.parse(proof);

    if (this.settledNonces.has(safeProof.nonce)) {
      return { settled: false, reason: "Authorization nonce already settled" };
    }

    const verification = await verifyProof(safeQuote, safeProof, { token: this.config.token, now });
    if (!verification.ok) return { settled: false, reason: verification.reason ?? "Invalid proof" };

    const result = await settleAuthorization(this.config.wallet, safeQuote, safeProof, {
      account: this.config.account,
      chain: this.config.chain,
      receipts: this.config.receipts,
    });

    if (result.status === "reverted") {
      return { settled: false, reason: `Settlement reverted (tx ${result.txHash})` };
    }

    this.settledNonces.add(safeProof.nonce);
    return { settled: true, txHash: result.txHash, recovered: verification.recovered };
  }

  isSettled(nonce: string) {
    return this.settledNonces.has(nonce);
  }
}
