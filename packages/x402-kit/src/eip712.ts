import { EvmAddressSchema, QuoteSchema, type Eip712TypedData, type Hex, type X402Quote } from "./types";

/**
 * Build the EIP-712 typed-data object for an ERC-3009
 * `TransferWithAuthorization` matching a quote. Pass the returned object to a
 * wallet's `signTypedData` (viem, ethers, MetaMask, CDP) — the kit stays
 * framework-agnostic and never touches the private key.
 *
 * Defensive: validates `quote` and `from` with the kit's zod schemas at entry,
 * so a direct caller that bypassed `createQuote()` cannot produce typed-data
 * from a malformed quote or an invalid payer address (a ZodError is thrown).
 *
 * @param tokenName  EIP-712 domain name of the token (e.g. "USD Coin").
 * @param tokenVersion EIP-712 domain version (USDC mainnet is "2").
 */
export function buildTransferAuthorization(
  quote: X402Quote,
  from: string,
  opts: { tokenName: string; tokenVersion: string },
): Eip712TypedData {
  const safeQuote = QuoteSchema.parse(quote);
  const safeFrom = EvmAddressSchema.parse(from);

  return {
    domain: {
      name: opts.tokenName,
      version: opts.tokenVersion,
      chainId: safeQuote.chainId,
      verifyingContract: safeQuote.asset as Hex,
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: safeFrom as Hex,
      to: safeQuote.payTo as Hex,
      value: safeQuote.amount,
      validAfter: safeQuote.validAfter,
      validBefore: safeQuote.validBefore,
      nonce: safeQuote.nonce as Hex,
    },
  };
}
