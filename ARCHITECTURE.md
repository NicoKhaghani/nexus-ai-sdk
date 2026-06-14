# Architecture

Nexus converts a single objective into a structured, paid execution pipeline.

```
User Objective
      │
      ▼
 Quest Planner            (quest.plan: objective -> Quest Plan)
      │
      ▼
 Execution Graph          (DAG: steps + dependsOn; validated for cycles)
      │
      ├── wave 0: independent steps run concurrently (Promise.all)
      ├── wave 1: steps whose deps completed
      └── ...
      │
      ▼
 Verification             (zod input/output schemas per step; retries on failure)
      │
      ▼
 Assembly                 (merge outputs, or select deliverable.from)
      │
      ▼
 Settlement (x402)        (quote -> sign -> verify+recover -> on-chain, once)
      │
      ▼
 Final Deliverable
```

## Packages

| Package | Responsibility |
|---|---|
| `@nexus/orchestrator-core` | Quest planning, DAG scheduling (`graph.ts`, Kahn's algorithm), parallel execution with retries (`runtime.ts`), assembly, and the `runPaidQuest` settlement gate (`settlement.ts`). |
| `@nexus/capability-runtime` | Capability contracts and a schema-enforcing registry with tag-based routing. |
| `@nexus/x402-kit` | Quote building (deterministic plan hash + crypto nonce), ERC-3009 EIP-712 typed-data, real signature recovery (viem), on-chain `transferWithAuthorization` submission, and an idempotent facilitator. |
| `@nexus/create-nexus-app` | CLI that scaffolds a runnable Nexus runtime project. |

## Execution model

A **Quest Plan** is a DAG. Each `QuestStep` names a capability (`uses`), an `input`, and optional
`dependsOn`. The runtime:

1. validates the graph (`scheduleWaves`) — rejecting duplicate ids, dangling dependencies, cycles;
2. groups steps into **waves** (a wave = steps with all dependencies satisfied);
3. runs each wave with `Promise.all`, so independent steps execute concurrently;
4. passes completed step outputs to dependents via `ctx.outputs`;
5. enforces optional zod input/output schemas, retrying per the step's `retry` policy;
6. assembles the deliverable.

## Provider-agnostic capabilities

Nexus AI orchestrates capabilities. A capability may be internal, private, API-backed,
model-backed, or fully custom. The runtime does not require any specific LLM provider.

Capabilities can be internal functions, private services, controlled infrastructure, external APIs,
external LLMs, or future local models. External providers are optional and belong to **Extended
Mode**; the orchestrator itself does not depend on any specific model provider.

## Settlement model (x402)

The quote records `planHash`, the sha256 of the canonicalized plan, alongside `amount`, `payTo`,
`chainId`, a validity window, and a single-use nonce. The payer signs an ERC-3009
`TransferWithAuthorization` (EIP-712) authorizing a USDC transfer. **The signed payload covers
`from`, `to`, `value`, `validAfter`, `validBefore`, and `nonce` only — not `planHash`.** The
server-side facilitator recovers the signer, checks the binding (quest id + nonce) and validity
window, enforces the `planHash` against its stored quote, then relays `transferWithAuthorization`
on-chain (paying gas). Each nonce settles at most once. `runPaidQuest` ensures execution only follows
a cleared settlement.

The facilitator's used-nonce set is **in-memory by default — adequate for demos/dev, not for
production.** A production deployment must persist quote records (`quoteId`, `nonce`, `planHash`,
`payer`, `amount`, `asset`, `expiration`) in a shared store and enforce them during verification, so
anti-replay and plan-hash binding survive across processes and restarts.
