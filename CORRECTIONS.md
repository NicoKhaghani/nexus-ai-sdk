# Alpha correctness pass — targeted corrections

Applied as small, reviewable diffs over the existing repo. No redesign, no renames, no removed
packages, no new dependencies (address validation reuses viem, already a dependency of `x402-kit`).

## Files changed

**orchestrator-core**
- `src/runtime.ts` — cascading skip: a step whose dependency failed or was skipped is marked
  `skipped` and never executed (no run with missing dependency outputs). Added duplicate-registration
  guards to `defineCapability` and `defineQuest`.
- `src/types.ts` — added `tasksSkipped` to `ExecutionSummary`.
- `src/settlement.ts` — comment wording (plan hash is server-side, not signed).
- `__tests__/runtime.test.ts` — new tests: direct skip, chained skip, independent step still runs;
  duplicate capability and duplicate quest guards.

**x402-kit**
- `src/types.ts` — `QuoteSchema.asset`, `QuoteSchema.payTo`, `ProofSchema.from` validated via viem
  `isAddress` (format only, `strict: false`). Clarified `nonce`/`planHash` doc comments.
- `src/quote.ts` — corrected `createQuote` doc: plan hash is recorded for server-side enforcement,
  not part of the ERC-3009 signed payload.
- `__tests__/quote.test.ts` — new address-validation tests; replaced `0xPayer` placeholder; updated a
  test name.
- `examples/quote-flow.ts` — replaced `0xPayerAddress` placeholder with a labeled dummy address;
  corrected the plan-hash comment.
- `README.md` — corrected the `createQuote` description.

**Docs**
- `README.md` — corrected settlement wording; added an explicit note that the ERC-3009 signature
  covers `from/to/value/validAfter/validBefore/nonce` (not `planHash`), and that production needs
  persistent quote storage (in-memory anti-replay is dev-only).
- `ARCHITECTURE.md`, `SECURITY.md`, `ROADMAP.md` — same correctness/wording fixes.

**Config**
- `.changeset/config.json` — `access` set to `public` (public alpha SDK).
- `.changeset/alpha-correctness-pass.md` — new changeset describing this pass.

## Placeholder addresses replaced
`0xPayer`, `0xPayerAddress` → valid dummy addresses (`0x…bEEF`, `0x…dEaD`), labeled "example only".
These are dummy addresses, not real payment destinations.

---

# x402 hardening pass (defensive public API)

Builds on the alpha correctness pass above. Every public x402 function now validates its inputs at
entry, so a direct caller cannot bypass `createQuote()` and feed malformed data deeper into the kit.

## Files changed
- `packages/x402-kit/src/types.ts` — renamed the internal address schema to **`EvmAddressSchema`** and
  exported it (was a private `EvmAddress` const).
- `packages/x402-kit/src/index.ts` — re-exports `EvmAddressSchema`.
- `packages/x402-kit/src/eip712.ts` — `buildTransferAuthorization` parses `quote` (`QuoteSchema`) and
  `from` (`EvmAddressSchema`) at entry; uses the parsed values.
- `packages/x402-kit/src/verify.ts` — `verifyProof` parses both `quote` (`QuoteSchema`) and `proof`
  (`ProofSchema`) at entry and uses the parsed values; well-formed-but-mismatched proofs still return
  a structured `{ ok: false, reason }` (malformed input now throws a `ZodError`).
- `packages/x402-kit/src/settle.ts` — `settleAuthorization` parses `quote` and `proof` at entry;
  the on-chain call is assembled only from parsed values.
- `packages/x402-kit/src/facilitator.ts` — `X402Facilitator.settle` parses `quote` and `proof` at
  entry; the anti-replay key and all downstream calls use parsed values.
- `packages/x402-kit/README.md` — added a "Defensive validation" note (plus the accurate `planHash`
  reminder).
- `packages/orchestrator-core/README.md` — added a "Dependency failure semantics" note.
- `.changeset/harden-x402-validation.md` — new changeset for this pass.

## Tests added (`packages/x402-kit/__tests__/defensive.test.ts`)
- `EvmAddressSchema` exported and usable (accepts valid, rejects placeholder).
- `buildTransferAuthorization`: valid works; rejects invalid `from`; rejects malformed quote.
- `verifyProof`: valid accepted (cryptographic); rejects malformed quote; rejects malformed proof.
- `settleAuthorization`: valid path works; rejects malformed quote; rejects malformed proof.
- `X402Facilitator`: rejects malformed proof before any on-chain call; replay protection still works.

## planHash wording (unchanged, still accurate)
The ERC-3009 signature does not sign `planHash`. The plan hash is associated with the quote
server-side and must be enforced by the server/facilitator during verification. Production
deployments should persist `quoteId`, `nonce`, `planHash`, `payer`/`from`, `amount`, `asset`,
`payTo`, and `expiration` before accepting settlement.
