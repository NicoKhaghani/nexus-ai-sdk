import { scheduleWaves } from "./graph";
import type {
  CapabilityContext,
  CapabilityDefinition,
  EventListener,
  ExecutionResult,
  QuestDefinition,
  QuestPlan,
  QuestPhase,
  QuestRuntimeMetadata,
  QuestStep,
  RuntimeEvent,
  StepResult,
} from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class QuestRuntime {
  private readonly metadata: QuestRuntimeMetadata;
  private readonly capabilities = new Map<string, CapabilityDefinition>();
  private readonly quests = new Map<string, QuestDefinition>();
  private readonly listeners = new Set<EventListener>();

  constructor(metadata: QuestRuntimeMetadata) {
    this.metadata = metadata;
  }

  /** Subscribe to execution lifecycle events. Returns an unsubscribe fn. */
  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: RuntimeEvent) {
    for (const listener of this.listeners) listener(event);
  }

  defineCapability<I, O>(capability: CapabilityDefinition<I, O>) {
    if (this.capabilities.has(capability.key)) {
      throw new Error(`Capability already defined: "${capability.key}"`);
    }
    this.capabilities.set(capability.key, capability as CapabilityDefinition);
    return capability;
  }

  defineQuest(quest: QuestDefinition) {
    if (this.quests.has(quest.key)) {
      throw new Error(`Quest already defined: "${quest.key}"`);
    }
    this.quests.set(quest.key, quest);
    return quest;
  }

  hasCapability(key: string) {
    return this.capabilities.has(key);
  }

  async plan(questKey: string, objective: string): Promise<QuestPlan> {
    const quest = this.quests.get(questKey);
    if (!quest) throw new Error(`Unknown quest: ${questKey}`);
    this.emit({ type: "phase", phase: "interpretation" });
    this.emit({ type: "phase", phase: "planning" });
    return await quest.plan({ objective });
  }

  /**
   * Execute a plan as a DAG: independent steps in a wave run concurrently,
   * waves run in order. Each step's input is merged with the outputs of its
   * declared dependencies. Input/output zod schemas are enforced; a schema
   * failure marks the run's validationStatus as "fail". Steps may declare a
   * retry policy applied on failure with exponential backoff.
   */
  async execute(
    plan: QuestPlan,
    options: { signal?: AbortSignal } = {},
  ): Promise<ExecutionResult> {
    const startedAt = Date.now();
    const waves = scheduleWaves(plan.steps); // validates the graph (throws on cycle / dangling dep)

    const outputs: Record<string, unknown> = {};
    const stepResults: StepResult[] = [];
    let validationFailed = false;
    let anySchemaChecked = false;

    this.emit({ type: "phase", phase: "execution" });

    // ids of steps that failed or were skipped — their dependents must not run
    const unavailable = new Set<string>();

    for (const wave of waves) {
      // Decide skip-vs-run before launching: a step whose dependency failed or
      // was skipped is marked "skipped" and never executed (no missing-output run).
      const toRun: QuestStep[] = [];
      for (const step of wave) {
        const blockedBy = (step.dependsOn ?? []).find((dep) => unavailable.has(dep));
        if (blockedBy !== undefined) {
          const result: StepResult = {
            id: step.id,
            uses: step.uses,
            status: "skipped",
            durationMs: 0,
            attempts: 0,
            error: `Skipped: dependency "${blockedBy}" did not complete`,
          };
          unavailable.add(step.id);
          stepResults.push(result);
          this.emit({ type: "step:complete", result });
        } else {
          toRun.push(step);
        }
      }

      const settled = await Promise.all(
        toRun.map((step) => this.runStep(step, outputs, options.signal)),
      );

      for (const { step, result, schemaChecked } of settled) {
        anySchemaChecked ||= schemaChecked;
        if (result.status === "completed") outputs[step.id] = result.output;
        if (result.status === "failed") {
          validationFailed = true;
          unavailable.add(step.id);
        }
        stepResults.push(result);
        this.emit({ type: "step:complete", result });
      }
    }

    this.emit({ type: "phase", phase: "verification" });
    this.emit({ type: "phase", phase: "assembly" });

    const deliverable = this.assemble(plan, outputs);
    const tasksFailed = stepResults.filter((s) => s.status === "failed").length;
    const tasksSkipped = stepResults.filter((s) => s.status === "skipped").length;

    this.emit({ type: "phase", phase: "delivered" });

    return {
      outputs,
      steps: stepResults,
      deliverable,
      summary: {
        tasksExecuted: stepResults.filter((s) => s.status === "completed").length,
        tasksFailed,
        tasksSkipped,
        durationMs: Date.now() - startedAt,
        validationStatus: validationFailed ? "fail" : anySchemaChecked ? "pass" : "skipped",
        capabilitiesUsed: [...new Set(plan.steps.map((s) => s.uses))],
        waves: waves.length,
      },
    };
  }

  private async runStep(
    step: QuestStep,
    outputs: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ step: QuestStep; result: StepResult; schemaChecked: boolean }> {
    const startedAt = Date.now();
    this.emit({ type: "step:start", id: step.id, uses: step.uses });

    const capability = this.capabilities.get(step.uses);
    if (!capability) {
      return {
        step,
        schemaChecked: false,
        result: {
          id: step.id,
          uses: step.uses,
          status: "failed",
          durationMs: 0,
          attempts: 0,
          error: `Unknown capability: ${step.uses}`,
        },
      };
    }

    const maxRetries = step.retry?.maxRetries ?? 0;
    const backoffMs = step.retry?.backoffMs ?? 100;
    let schemaChecked = false;
    let lastError = "";
    let attempts = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts = attempt + 1;
      try {
        let input = step.input;
        if (capability.input) {
          input = capability.input.parse(input);
          schemaChecked = true;
        }

        const ctx: CapabilityContext = { outputs, signal };
        let output = await capability.execute(input, ctx);

        if (capability.output) {
          output = capability.output.parse(output);
          schemaChecked = true;
        }

        return {
          step,
          schemaChecked,
          result: {
            id: step.id,
            uses: step.uses,
            status: "completed",
            durationMs: Date.now() - startedAt,
            attempts,
            output,
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < maxRetries) await sleep(backoffMs * 2 ** attempt);
      }
    }

    return {
      step,
      schemaChecked,
      result: {
        id: step.id,
        uses: step.uses,
        status: "failed",
        durationMs: Date.now() - startedAt,
        attempts,
        error: lastError,
      },
    };
  }

  private assemble(plan: QuestPlan, outputs: Record<string, unknown>): unknown {
    const d = plan.deliverable;
    if (d && typeof d === "object" && "from" in d && typeof d.from === "string") {
      return outputs[d.from];
    }
    return outputs;
  }

  getMetadata() {
    return this.metadata;
  }
}

export function createQuestRuntime(metadata: QuestRuntimeMetadata) {
  return new QuestRuntime(metadata);
}

export type { QuestPhase };
