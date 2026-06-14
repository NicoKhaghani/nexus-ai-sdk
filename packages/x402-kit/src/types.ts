import { z } from "zod";
import { isAddress } from "viem";

export type Hex = `0x${string}`;

/**
 * A 0x-prefixed 40-hex EVM address. Validates format via viem's `isAddress`
 * (strict: false — format only, no checksum enforcement), so placeholders like
 * "0xPayer" are rejected while any well-formed address is accepted.
 */
export const EvmAddressSchema = z
  .string()
  .refine((v): boolean => isAddress(v, { strict: false }), { message: "Invalid EVM address" });

/**
 * x402 settlement types.
 *
 * The flow modeled here is the real "pay-per-execution" pattern used on EVM
 * chains: the server returns a quote, the client signs an ERC-3009
 * `TransferWithAuthorization` EIP-712 message authorizing a USDC transfer, and
 * the server (or a facilitator) submits that authorization on-chain and
 * verifies the resulting proof before releasing the result.
 *
 * This package builds and validates the off-chain artifacts (quote, typed-data,
 * proof envelope). On-chain submission is delegated to a signer/facilitator the
 * integrator plugs in — the kit deliberately does not bundle a wallet.
 */

export const QuoteSchema = z.object({
  questId: z.string().min(1),
  /** atomic units as a decimal string, e.g. "1000000" for 1 USDC (6 decimals) */
  amount: z.string().regex(/^\d+$/),
  /** token contract address (e.g. USDC) */
  asset: EvmAddressSchema,
  /** EVM chain id, e.g. 8453 for Base */
  chainId: z.number().int().positive(),
  /** address that receives the payment */
  payTo: EvmAddressSchema,
  /** unix seconds after which the quote / authorization is invalid */
  validBefore: z.number().int().positive(),
  validAfter: z.number().int().nonnegative(),
  /** 32-byte hex nonce of the ERC-3009 authorization (single-use on-chain) */
  nonce: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  /**
   * Deterministic hash of the Quest Plan this quote pays for. Held in the quote
   * for server-side binding; it is NOT part of the ERC-3009 signed payload (see
   * eip712.ts) and must be enforced by the server/facilitator during verification.
   */
  planHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

export type X402Quote = z.infer<typeof QuoteSchema>;

export const ProofSchema = z.object({
  /** the quote that was authorized */
  questId: z.string().min(1),
  nonce: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  /** payer wallet address recovered from / claimed for the signature */
  from: EvmAddressSchema,
  /** the 65-byte EIP-712 signature over the TransferWithAuthorization message */
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
  /** settlement tx hash, present once the authorization is submitted */
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
});

export type X402Proof = z.infer<typeof ProofSchema>;

export interface Eip712TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Hex;
  };
  types: Record<string, { name: string; type: string }[]>;
  primaryType: "TransferWithAuthorization";
  message: {
    from: Hex;
    to: Hex;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: Hex;
  };
}

export interface RetryPayload<T = unknown> {
  quote: X402Quote;
  proof: X402Proof;
  payload: T;
}
