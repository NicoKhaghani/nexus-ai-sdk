# Roadmap

## Done
- Dependency-aware execution graph with cycle / dangling-dependency detection.
- Parallel wave execution.
- Per-step zod input/output validation.
- Per-step retries with exponential backoff.
- Lifecycle events (phase + per-step).
- Assembly via `deliverable.from`.
- x402: deterministic quotes recording a plan hash, ERC-3009 EIP-712 construction.
- x402: real EIP-712 signature recovery (viem).
- x402: on-chain `transferWithAuthorization` submission via a facilitator.
- x402: single-settlement-per-nonce guard.
- `runPaidQuest` gate (no execution without cleared payment).
- CLI scaffolding (`create-nexus-app`).

## Next
- Persistent (cross-process) nonce / settlement store for the facilitator.
- Streaming and partial results during execution.
- Capability marketplace + remote capability adapters.
- Per-wave concurrency limits / backpressure.
- Settlement on additional chains and tokens beyond USDC/Base.

## Non-goals (for now)
- Bundling a wallet or private-key management — signing stays with the integrator's wallet.
- A hosted execution service — this is an SDK.
