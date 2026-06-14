---
"@nexus/x402-kit": patch
---

Harden public x402 validation: `buildTransferAuthorization`, `verifyProof`, `settleAuthorization`, and `X402Facilitator.settle` now validate their `quote` / `proof` / address inputs with the kit's zod schemas at entry (throwing `ZodError` on malformed input), so direct SDK calls are safe even when callers bypass `createQuote()`. Exported `EvmAddressSchema` for reuse.
