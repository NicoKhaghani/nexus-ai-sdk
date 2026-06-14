import { parseSignature } from "viem";
import { ERC3009_ABI } from "./abi";
import { ProofSchema, QuoteSchema, type Hex, type X402Proof, type X402Quote } from "./types";

/**
 * Minimal surface of a viem WalletClient needed to submit the authorization.
 *
 * `writeContract` args are intentionally loosely typed: viem's `writeContract`
 * generics are not structurally assignable to a narrow interface, so widening
 * here lets a real viem WalletClient (or a CDP server wallet, or a test mock) be
 * injected directly. The call itself is precisely typed in `settleAuthorization`.
 */
export interface SettlementWallet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeContract: (args: any) => Promise<Hex>;
}

export interface ReceiptWatcher {
  waitForTransactionReceipt: (args: { hash: Hex }) => Promise<{ status: "success" | "reverted" }>;
}

export interface SettleResult {
  txHash: string;
  status: "success" | "reverted";
}

interface TransferWithAuthorizationCall {
  address: Hex;
  abi: typeof ERC3009_ABI;
  functionName: "transferWithAuthorization";
  args: readonly [Hex, Hex, bigint, bigint, bigint, Hex, number, Hex, Hex];
  account?: unknown;
  chain?: unknown;
}

/**
 * Submit a signed x402 authorization on-chain.
 *
 * Defensive: validates `quote` and `proof` with the kit's zod schemas at entry
 * (a ZodError is thrown on malformed input), so the on-chain call is never
 * assembled from untrusted/garbage fields even when called directly.
 *
 * The relayer/facilitator (server-side wallet) pays gas and calls the token's
 * ERC-3009 `transferWithAuthorization`, pulling exactly `quote.amount` from the
 * payer to `quote.payTo`. The payer's signature authorizes the transfer; they
 * never send a transaction themselves. Returns the tx hash and final status.
 */
export async function settleAuthorization(
  wallet: SettlementWallet,
  quote: X402Quote,
  proof: X402Proof,
  options: { account?: unknown; chain?: unknown; receipts?: ReceiptWatcher } = {},
): Promise<SettleResult> {
  const safeQuote = QuoteSchema.parse(quote);
  const safeProof = ProofSchema.parse(proof);

  const { r, s, v, yParity } = parseSignature(safeProof.signature as Hex);
  const recoveryByte = Number(v ?? (yParity === 1 ? 28n : 27n));

  const call: TransferWithAuthorizationCall = {
    address: safeQuote.asset as Hex,
    abi: ERC3009_ABI,
    functionName: "transferWithAuthorization",
    args: [
      safeProof.from as Hex,
      safeQuote.payTo as Hex,
      BigInt(safeQuote.amount),
      BigInt(safeQuote.validAfter),
      BigInt(safeQuote.validBefore),
      safeQuote.nonce as Hex,
      recoveryByte,
      r,
      s,
    ],
    account: options.account,
    chain: options.chain,
  };

  const txHash = await wallet.writeContract(call);

  if (options.receipts) {
    const receipt = await options.receipts.waitForTransactionReceipt({ hash: txHash });
    return { txHash, status: receipt.status };
  }

  return { txHash, status: "success" };
}
