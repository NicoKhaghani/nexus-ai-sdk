# Contributing

## Setup
```bash
bun install
bun run typecheck
bun test
```

## Workflow
1. Branch from `main`.
2. Make your change with a test that covers it.
3. `bun run typecheck && bun test` must pass.
4. Add a changeset: `bun run changeset`.
5. Open a PR. CI runs typecheck, build, and tests.

## Coding standards
- TypeScript strict mode; no `any` except at documented external boundaries (e.g. the viem wallet
  adapter in `x402-kit/src/settle.ts`).
- Prettier-formatted (`bun run format`).
- Public API changes go through `index.ts` barrels and need a changeset.

## Testing guidelines
- Unit-test pure logic (graph scheduling, quote/proof) directly.
- For settlement, test signature recovery with a real local account and the on-chain call with an
  injected mock wallet (assert the contract call shape), as in `x402-kit/__tests__/settle.test.ts`.
