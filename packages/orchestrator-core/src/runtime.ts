import type {
  CapabilityDefinition,
  ExecutionSummary,
  QuestDefinition,
  QuestPlan,
  QuestRuntimeMetadata,
} from "./types";

export class QuestRuntime {
  private readonly metadata: QuestRuntimeMetadata;
  private readonly capabilities = new Map<string, CapabilityDefinition>();
  private readonly quests = new Map<string, QuestDefinition>();

  constructor(metadata: QuestRuntimeMetadata) {
    this.metadata = metadata;
  }

  defineCapability<I, O>(capability: CapabilityDefinition<I, O>) {
    this.capabilities.set(capability.key, capability as CapabilityDefinition);
    return capability;
  }

  defineQuest(quest: QuestDefinition) {
    this.quests.set(quest.key, quest);
    return quest;
  }

  async plan(questKey: string, objective: string): Promise<QuestPlan> {
    const quest = this.quests.get(questKey);
    if (!quest) throw new Error(`Unknown quest: ${questKey}`);
    return await quest.plan({ objective });
  }

  async execute(plan: QuestPlan): Promise<{ outputs: Record<string, unknown>; summary: ExecutionSummary }> {
    const startedAt = Date.now();
    const outputs: Record<string, unknown> = {};

    for (const step of plan.steps) {
      const capability = this.capabilities.get(step.uses);
      if (!capability) throw new Error(`Unknown capability: ${step.uses}`);
      outputs[step.id] = await capability.execute(step.input);
    }

    return {
      outputs,
      summary: {
        tasksExecuted: plan.steps.length,
        durationMs: Date.now() - startedAt,
        validationStatus: "skipped",
        capabilitiesUsed: [...new Set(plan.steps.map((s) => s.uses))],
      },
    };
  }

  getMetadata() {
    return this.metadata;
  }
}

export function createQuestRuntime(metadata: QuestRuntimeMetadata) {
  return new QuestRuntime(metadata);
}
