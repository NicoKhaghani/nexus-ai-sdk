import { recoverTypedDataAddress, type Hex } from "viem";
import { buildTransferAuthorization } from "./eip712";
import { isQuoteValid } from "./quote";
import {
  ProofSchema,
  QuoteSchema,
  type RetryPayload,
  type X402Proof,
  type X402Quote,
} from "./types";

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  /** address recovered from the signature, when recovery was performed */
  recovered?: string;
}

export interface VerifyOptions {
  /** EIP-712 token domain; required to cryptographically recover the signer */
  token?: { name: string; version: string };
  now?: number;
}

/**
 * Verify a proof against the quote it claims to pay.
 *
 * Defensive: both `quote` and `proof` are parsed with the kit's zod schemas at
 * entry (a ZodError is thrown on malformed structure or invalid addresses), so
 * a direct caller cannot have nonce/questId/expiration/address fields compared
 * before they are known to be well-formed. The returned `VerifyResult` then
 * reports business-logic outcomes (mismatch, expiry, bad signature) for
 * well-formed inputs. When `options.token` is supplied, it ALSO recovers the
 * signer from the ERC-3009 EIP-712 signature and asserts it equals `proof.from`.
 */
export async function verifyProof(
  quote: X402Quote,
  proof: X402Proof,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const safeQuote = QuoteSchema.parse(quote);
  const safeProof = ProofSchema.parse(proof);

  if (safeProof.questId !== safeQuote.questId) return { ok: false, reason: "questId mismatch" };
  if (safeProof.nonce !== safeQuote.nonce) return { ok: false, reason: "nonce mismatch" };
  if (!isQuoteValid(safeQuote, options.now)) {
    return { ok: false, reason: "Quote expired or not yet valid" };
  }

  if (!options.token) return { ok: true };

  const typedData = buildTransferAuthorization(safeQuote, safeProof.from, {
    tokenName: options.token.name,
    tokenVersion: options.token.version,
  });

  let recovered: string;
  try {
    recovered = await recoverTypedDataAddress({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
      signature: safeProof.signature as Hex,
    });
  } catch {
    return { ok: false, reason: "Signature recovery failed" };
  }

  if (recovered.toLowerCase() !== safeProof.from.toLowerCase()) {
    return { ok: false, reason: "Signature does not match `from`", recovered };
  }

  return { ok: true, recovered };
}

/** Bundle a quote, its proof and the original request payload for a retry. */
export function withProof<T>(quote: X402Quote, proof: X402Proof, payload: T): RetryPayload<T> {
  return { quote, proof, payload };
}
