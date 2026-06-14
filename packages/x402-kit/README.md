# @nexus/x402-kit

End-to-end x402 settlement helpers for pay-per-execution flows on EVM chains.

```ts
import { createQuote, buildTransferAuthorization, verifyProof, X402Facilitator } from "@nexus/x402-kit";
```

- `createQuote(input)` — a quote recording price + payee + chain + nonce, plus a plan hash kept
  for server-side enforcement (the plan hash is not part of the ERC-3009 signed payload).
- `buildTransferAuthorization(quote, from, token)` — the ERC-3009 EIP-712 payload to sign.
- `verifyProof(quote, proof, { token })` — recovers the EIP-712 signer and checks the binding.
- `settleAuthorization(wallet, quote, proof)` — relays `transferWithAuthorization` on-chain (viem).
- `X402Facilitator` — verify + settle + single-settlement-per-nonce.

The kit never holds private keys: the payer signs with their own wallet; the facilitator relays.

## Defensive validation

All public x402 helpers (`buildTransferAuthorization`, `verifyProof`, `settleAuthorization`, and
`X402Facilitator.settle`) validate their `quote` / `proof` / address inputs with the same zod schemas
used internally by the kit (`QuoteSchema`, `ProofSchema`, `EvmAddressSchema`). This keeps direct SDK
calls defensive even when a caller bypasses `createQuote()` — malformed input throws a `ZodError`
rather than producing a bad authorization. `EvmAddressSchema` is exported so consumers can reuse the
exact address validation the SDK applies.

Note on `planHash`: the ERC-3009 `TransferWithAuthorization` signature does **not** sign the
`planHash`. The `planHash` is associated with the quote server-side and must be enforced by the
server/facilitator during verification. Production deployments should persist `quoteId`, `nonce`,
`planHash`, `payer`/`from`, `amount`, `asset`, `payTo`, and `expiration` before accepting settlement.
