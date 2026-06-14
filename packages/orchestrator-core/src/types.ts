import type { z } from "zod";

export type QuestPhase =
  | "interpretation"
  | "planning"
  | "execution"
  | "verification"
  | "assembly"
  | "delivered";

export interface RetryPolicy {
  /** number of additional attempts after the first (0 = no retry) */
  maxRetries: number;
  /** base delay in ms; grows as backoffMs * 2^attempt */
  backoffMs?: number;
}

export interface QuestStep<Input = unknown> {
  id: string;
  uses: string;
  input: Input;
  /** ids of steps whose outputs this step consumes */
  dependsOn?: string[];
  /** optional per-step retry policy on failure */
  retry?: RetryPolicy;
}

export interface QuestPlan {
  phases: QuestPhase[];
  steps: QuestStep[];
  /** describes how to assemble the final deliverable from step outputs */
  deliverable?: { from: string } | Record<string, unknown>;
}

export interface QuestRuntimeMetadata {
  name: string;
  version: string;
  description?: string;
}

/**
 * A capability is a typed unit of work. Optional zod schemas are enforced at
 * runtime for both input and output, so a misbehaving capability fails loudly
 * during the verification phase instead of silently corrupting the assembly.
 */
export interface CapabilityDefinition<I = unknown, O = unknown> {
  key: string;
  input?: z.ZodType<I>;
  output?: z.ZodType<O>;
  execute: (input: I, ctx: CapabilityContext) => Promise<O> | O;
}

export interface CapabilityContext {
  /** outputs of already-completed steps, keyed by step id */
  outputs: Readonly<Record<string, unknown>>;
  signal?: AbortSignal;
}

export interface QuestDefinition {
  key: string;
  plan: (input: { objective: string }) => Promise<QuestPlan> | QuestPlan;
}

export type StepStatus = "completed" | "failed" | "skipped";

export interface StepResult {
  id: string;
  uses: string;
  status: StepStatus;
  durationMs: number;
  attempts: number;
  output?: unknown;
  error?: string;
}

export interface ExecutionSummary {
  tasksExecuted: number;
  tasksFailed: number;
  tasksSkipped: number;
  durationMs: number;
  validationStatus: "pass" | "fail" | "skipped";
  capabilitiesUsed: string[];
  waves: number;
}

export interface ExecutionResult {
  outputs: Record<string, unknown>;
  steps: StepResult[];
  summary: ExecutionSummary;
  deliverable?: unknown;
}

export type RuntimeEvent =
  | { type: "phase"; phase: QuestPhase }
  | { type: "step:start"; id: string; uses: string }
  | { type: "step:complete"; result: StepResult };

export type EventListener = (event: RuntimeEvent) => void;
