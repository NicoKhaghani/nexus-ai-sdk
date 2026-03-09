import { describe, expect, test } from "bun:test";
import { createQuestRuntime } from "../src";

describe("createQuestRuntime", () => {
  test("plans and executes a minimal quest", async () => {
    const runtime = createQuestRuntime({
      name: "test-runtime",
      version: "1.0.0",
    });

    runtime.defineCapability({
      key: "text.generate",
      async execute(input: { prompt: string }) {
        return { text: input.prompt.toUpperCase() };
      },
    });

    runtime.defineQuest({
      key: "demo.quest",
      plan: async ({ objective }) => ({
        phases: ["interpretation", "planning", "execution", "delivered"],
        steps: [{ id: "draft", uses: "text.generate", input: { prompt: objective } }],
      }),
    });

    const plan = await runtime.plan("demo.quest", "hello");
    const result = await runtime.execute(plan);

    expect(result.outputs.draft).toBeDefined();
  });
});
