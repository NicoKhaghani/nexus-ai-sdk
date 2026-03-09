export type QuestPhase =
  | "interpretation"
  | "planning"
  | "execution"
  | "verification"
  | "assembly"
  | "delivered";

export interface QuestStep<Input = unknown> {
  id: string;
  uses: string;
  input: Input;
  dependsOn?: string[];
}

export interface QuestPlan {
  phases: QuestPhase[];
  steps: QuestStep[];
  deliverable?: Record<string, unknown>;
}

export interface QuestRuntimeMetadata {
  name: string;
  version: string;
  description?: string;
}

export interface CapabilityDefinition<I = unknown, O = unknown> {
  key: string;
  execute: (input: I) => Promise<O>;
}

export interface QuestDefinition {
  key: string;
  plan: (input: { objective: string }) => Promise<QuestPlan> | QuestPlan;
}

export interface ExecutionSummary {
  tasksExecuted: number;
  durationMs: number;
  validationStatus: "pass" | "fail" | "skipped";
  capabilitiesUsed: string[];
}
