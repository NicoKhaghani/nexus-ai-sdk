---
"@nexus/orchestrator-core": patch
"@nexus/x402-kit": patch
---

Alpha correctness pass:
- Runtime cascades skips: dependents of a failed/skipped step are marked `skipped` instead of running with missing inputs; summary reports `tasksSkipped`.
- `QuestRuntime.defineCapability` / `defineQuest` throw on duplicate keys (error names the key).
- x402 `QuoteSchema` / `ProofSchema` validate `asset`, `payTo`, `from` as EVM addresses via viem `isAddress`.
- Replaced invalid placeholder addresses in examples/tests with valid dummy addresses.
- Corrected docs: the ERC-3009 signature does not sign `planHash`; the plan hash is enforced server-side. In-memory anti-replay is dev-only; production needs persistent quote storage.
