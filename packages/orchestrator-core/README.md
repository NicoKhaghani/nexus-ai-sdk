# @nexus/orchestrator-core

Quest planning, dependency-aware parallel execution, verification, assembly, and x402 settlement
gating.

```ts
import { createQuestRuntime, runPaidQuest } from "@nexus/orchestrator-core";
```

- `createQuestRuntime(metadata)` — define capabilities and quests, then `plan()` and `execute()`.
- `scheduleWaves(steps)` — validate a DAG and get parallel execution waves.
- `runPaidQuest(runtime, input)` — gate a Quest behind a single x402 settlement.

Execution runs independent steps concurrently, passes dependency outputs via `ctx.outputs`, enforces
optional zod schemas, and retries per a step's `retry` policy. See `examples/`.

**Private Mode** is the default (`executionMode` omitted or `"private"`). Nexus orchestrates
capabilities without requiring external providers. External LLMs and APIs are optional capability
implementations configured in **Extended Mode** — they are integrations, not Nexus dependencies.

## Dependency failure semantics

If a step fails, any downstream step that depends on it (directly or transitively) is marked
`skipped` and never executed with missing inputs. Independent steps in other branches can still
complete. The execution result reports each step as `completed`, `failed`, or `skipped`, and the
summary includes `tasksSkipped`.
