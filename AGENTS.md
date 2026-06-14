# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo.

## Layout
- Source lives in `packages/<name>/src`. Tests in `packages/<name>/__tests__`. Examples in
  `packages/<name>/examples`.
- Cross-package imports use the workspace alias `@nexus/<name>` (see each `tsconfig.json` `paths`).

## Build order
`@nexus/x402-kit` builds before `@nexus/orchestrator-core` (the latter imports the former). The
build script enforces this order.

## Rules
- Keep claims in docs aligned with code. If a feature isn't implemented, list it under ROADMAP
  "Next", not as done.
- Every capability that can fail should surface the failure; do not swallow errors into a fake
  success.
- New runtime behavior needs a test in `__tests__` that exercises it (concurrency, retries,
  validation, settlement).
- Run `bun run typecheck` and `bun test` before committing.

## Commands
- `bun install`
- `bun run typecheck`
- `bun run build:packages`
- `bun test`
