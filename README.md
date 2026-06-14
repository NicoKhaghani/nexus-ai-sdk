# Nexus AI SDK

[![CI](https://github.com/NicoKhaghani/nexus-ai-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/NicoKhaghani/nexus-ai-sdk/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/NicoKhaghani/nexus-ai-sdk/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)](https://www.typescriptlang.org/)
[![Monorepo](https://img.shields.io/badge/architecture-monorepo-black)](#monorepo-structure)

Build, observe, and settle **Quest-based AI execution** through a unified orchestration surface.

Nexus turns a **single objective** into a **structured outcome**:

```
objective → Quest Plan → execution graph → verification → assembly → delivery
```

Unlike a single-model chat loop, Nexus operates as an **AI execution runtime**. It interprets an
objective, decomposes it into a dependency graph of steps, runs independent steps in parallel,
validates each output against its declared schema, assembles a single deliverable, and settles the
whole Quest once via **x402**.

---

## Status

Early but **functional** core. What is implemented today:

- **Dependency-aware execution graph** — steps declare `dependsOn`; the runtime validates the DAG
  (rejecting cycles and dangling dependencies) and schedules independent steps into concurrent waves.
- **Real parallel execution** — independent steps in a wave run via `Promise.all`.
- **Schema-enforced verification** — optional `zod` input/output schemas are enforced per step; a
  breach marks the step failed and the run's `validationStatus` as `fail`.
- **Assembly** — outputs are merged, or a single step's output is selected via `deliverable.from`.
- **Observability** — subscribe to phase and per-step lifecycle events.
- **Per-step retries** — optional retry policy with exponential backoff.
- **x402 settlement, end to end** — quotes that record a deterministic plan hash, ERC-3009
  `TransferWithAuthorization` EIP-712 construction, **real signature recovery** (viem), and on-chain
  submission via a facilitator that pays gas and settles each nonce exactly once. The plan hash is
  enforced server-side; it is not part of the signed payload (see note below).

Not yet implemented (tracked in [ROADMAP.md](./ROADMAP.md)): persistent (cross-process) nonce store
for the facilitator, streaming/partial results, and the capability marketplace.

---

## Execution Modes

Nexus AI orchestrates capabilities. A capability may be internal, private, API-backed,
model-backed, or fully custom. The runtime does not require any specific LLM provider.

**Private Mode** (default) — privacy-first execution using internal and private capabilities only.
No external LLM or model dependency. Suitable for web deployments where execution stays inside
the controlled Nexus environment.

**Extended Mode** (optional) — allows developer-configured external capabilities. External LLMs and
APIs are used only when explicitly enabled. Nexus remains provider-agnostic; external providers are
integrations, not runtime dependencies.

```ts
const runtime = createQuestRuntime({
  name: "my-runtime",
  version: "0.1.0",
  executionMode: "extended", // omit for Private Mode (default)
});
```

---

## Monorepo Structure

```
nexus-ai-sdk/
  packages/
    orchestrator-core/    # Quest planning, DAG scheduler, parallel execution, assembly
    capability-runtime/   # Capability contracts, schema-enforcing registry, tag routing
    x402-kit/             # Quote / EIP-712 authorization / proof verification
    create-nexus-app/     # CLI scaffolding tool
  scripts/                # Build helpers
  .github/workflows/      # CI
```

---

## Example

```ts
import { createQuestRuntime } from "@nexus/orchestrator-core";
import { z } from "zod";

const runtime = createQuestRuntime({ name: "demo-runtime", version: "0.1.0" });

runtime.defineCapability({
  key: "text.generate",
  input: z.object({ prompt: z.string() }),
  output: z.object({ text: z.string() }),
  async execute({ prompt }) {
    return { text: `Generated output for: ${prompt}` };
  },
});

runtime.defineCapability({
  key: "summarize",
  async execute(_input, ctx) {
    const draft = (ctx.outputs.draft as { text: string }).text;
    return { summary: draft.slice(0, 140) };
  },
});

runtime.defineQuest({
  key: "investor.onepager",
  plan: async ({ objective }) => ({
    phases: ["interpretation", "planning", "execution", "verification", "assembly", "delivered"],
    steps: [
      { id: "draft", uses: "text.generate", input: { prompt: objective } },
      { id: "summary", uses: "summarize", input: {}, dependsOn: ["draft"] },
    ],
    deliverable: { from: "summary" },
  }),
});

const plan = await runtime.plan("investor.onepager", "One-pager for a Web3 AI orchestrator");
const result = await runtime.execute(plan);

console.log(result.summary);     // { tasksExecuted, validationStatus, waves, ... }
console.log(result.deliverable); // assembled output of the "summary" step
```

An Extended Mode example with an optional model-backed capability lives at
[`packages/orchestrator-core/examples/model-capability.ts`](./packages/orchestrator-core/examples/model-capability.ts).
The core example above runs without any external provider.

---

## x402 Settlement

```ts
import { createQuote, buildTransferAuthorization, verifyProof } from "@nexus/x402-kit";

// 1. Server quotes the Quest (records amount + payee + chain + nonce + plan hash)
const quote = createQuote({
  questId: "quest-1",
  amount: "1000000",                 // 1 USDC (6 decimals), atomic units
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  chainId: 8453,
  payTo: serverWallet,
  plan,
});

// 2. Client builds the ERC-3009 EIP-712 payload and signs it with its own wallet
const typedData = buildTransferAuthorization(quote, payerWallet, {
  tokenName: "USD Coin",
  tokenVersion: "2",
});
// const signature = await wallet.signTypedData(typedData);  // viem / ethers / MetaMask / CDP

// 3. Server verifies the proof (recovers the signer) and settles on-chain
import { X402Facilitator } from "@nexus/x402-kit";

const facilitator = new X402Facilitator({
  wallet: relayerWalletClient,            // viem WalletClient (pays gas)
  token: { name: "USD Coin", version: "2" },
});

const outcome = await facilitator.settle(quote, { questId: quote.questId, nonce: quote.nonce, from: payerWallet, signature });
// outcome.settled === true  -> outcome.txHash is the settlement transaction
```

To gate a whole Quest behind a single settlement, use `runPaidQuest` from
`@nexus/orchestrator-core`: it plans, quotes, collects the signed authorization, settles once via the
facilitator, and only then executes. Execution never runs unless payment clears. See
[`packages/orchestrator-core/examples/paid-quest.ts`](./packages/orchestrator-core/examples/paid-quest.ts).

> **On `planHash` (read this).** The ERC-3009 `TransferWithAuthorization` signature covers
> `from`, `to`, `value`, `validAfter`, `validBefore`, and `nonce` only — **not** the `planHash`. The
> `planHash` is associated with the quote and must be enforced by the server/facilitator at
> verification time. In other words, the quote binds the plan hash *server-side*; it is not part of
> the signed payload.
>
> **Production storage.** This is alpha SDK infrastructure. The facilitator's anti-replay guard is
> in-memory, which is fine for demos and dev but **not** sufficient for production. A production
> deployment should persist `quoteId`, `nonce`, `planHash`, `payer`, `amount`, `asset`, and
> `expiration` before accepting settlement, and verify them on the way back. Do not rely on the
> in-memory guard across processes or restarts.

---

## Quick Start

```bash
# Prerequisites: Bun >= 1.1, Git
git clone https://github.com/NicoKhaghani/nexus-ai-sdk
cd nexus-ai-sdk
bun install

bun run build:packages
bun test
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding standards, testing, and the
release process.

## License

MIT — see [LICENSE](./LICENSE).
