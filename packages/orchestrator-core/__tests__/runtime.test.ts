import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { createQuestRuntime, scheduleWaves, QuestGraphError } from "../src";

describe("scheduleWaves", () => {
  test("groups independent steps into the same wave", () => {
    const waves = scheduleWaves([
      { id: "a", uses: "x", input: {} },
      { id: "b", uses: "x", input: {} },
      { id: "c", uses: "x", input: {}, dependsOn: ["a", "b"] },
    ]);
    expect(waves.length).toBe(2);
    expect(waves[0].map((s) => s.id).sort()).toEqual(["a", "b"]);
    expect(waves[1].map((s) => s.id)).toEqual(["c"]);
  });

  test("throws on a missing dependency", () => {
    expect(() => scheduleWaves([{ id: "a", uses: "x", input: {}, dependsOn: ["ghost"] }])).toThrow(
      QuestGraphError,
    );
  });

  test("throws on a cycle", () => {
    expect(() =>
      scheduleWaves([
        { id: "a", uses: "x", input: {}, dependsOn: ["b"] },
        { id: "b", uses: "x", input: {}, dependsOn: ["a"] },
      ]),
    ).toThrow(/cycle/i);
  });
});

describe("QuestRuntime", () => {
  test("runs independent steps concurrently", async () => {
    const runtime = createQuestRuntime({ name: "t", version: "1.0.0" });
    let peak = 0;
    let active = 0;

    runtime.defineCapability({
      key: "slow",
      async execute() {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 25));
        active--;
        return { ok: true };
      },
    });

    const plan = await runtime
      .defineQuest({
        key: "q",
        plan: () => ({
          phases: ["execution"],
          steps: [
            { id: "a", uses: "slow", input: {} },
            { id: "b", uses: "slow", input: {} },
            { id: "c", uses: "slow", input: {} },
          ],
        }),
      })
      && runtime.plan("q", "go");

    const result = await runtime.execute(await plan);
    expect(result.summary.tasksExecuted).toBe(3);
    expect(peak).toBeGreaterThan(1); // proves real concurrency
  });

  test("passes dependency outputs through ctx and respects ordering", async () => {
    const runtime = createQuestRuntime({ name: "t", version: "1.0.0" });

    runtime.defineCapability({
      key: "text.generate",
      input: z.object({ prompt: z.string() }),
      output: z.object({ text: z.string() }),
      execute: async ({ prompt }) => ({ text: prompt.toUpperCase() }),
    });
    runtime.defineCapability({
      key: "decorate",
      execute: async (_i, ctx) => {
        const upstream = (ctx.outputs.draft as { text: string }).text;
        return { decorated: `<<${upstream}>>` };
      },
    });

    runtime.defineQuest({
      key: "q",
      plan: () => ({
        phases: ["execution"],
        steps: [
          { id: "draft", uses: "text.generate", input: { prompt: "hi" } },
          { id: "final", uses: "decorate", input: {}, dependsOn: ["draft"] },
        ],
        deliverable: { from: "final" },
      }),
    });

    const result = await runtime.execute(await runtime.plan("q", "x"));
    expect(result.deliverable).toEqual({ decorated: "<<HI>>" });
    expect(result.summary.validationStatus).toBe("pass");
  });

  test("marks validationStatus fail when a capability breaks its output schema", async () => {
    const runtime = createQuestRuntime({ name: "t", version: "1.0.0" });
    runtime.defineCapability({
      key: "bad",
      output: z.object({ n: z.number() }),
      // returns a string where a number is required
      execute: async () => ({ n: "not-a-number" }) as unknown as { n: number },
    });
    runtime.defineQuest({
      key: "q",
      plan: () => ({ phases: ["execution"], steps: [{ id: "s", uses: "bad", input: {} }] }),
    });

    const result = await runtime.execute(await runtime.plan("q", "x"));
    expect(result.summary.validationStatus).toBe("fail");
    expect(result.steps[0].status).toBe("failed");
  });
});

describe("QuestRuntime — dependency failure cascades to skips", () => {
  function runtimeWithSteps() {
    const runtime = createQuestRuntime({ name: "t", version: "1.0.0" });
    runtime.defineCapability({
      key: "fail",
      execute: async () => {
        throw new Error("boom");
      },
    });
    runtime.defineCapability({ key: "noop", execute: async () => ({ ok: true }) });
    return runtime;
  }

  test("direct dependent of a failed step is skipped, not run", async () => {
    const runtime = runtimeWithSteps();
    let bRan = false;
    runtime.defineCapability({
      key: "b",
      execute: async () => {
        bRan = true;
        return {};
      },
    });
    runtime.defineQuest({
      key: "q",
      plan: () => ({
        phases: ["execution"],
        steps: [
          { id: "a", uses: "fail", input: {} },
          { id: "b", uses: "b", input: {}, dependsOn: ["a"] },
        ],
      }),
    });

    const result = await runtime.execute(await runtime.plan("q", "x"));
    const byId = Object.fromEntries(result.steps.map((s) => [s.id, s.status]));
    expect(byId).toEqual({ a: "failed", b: "skipped" });
    expect(bRan).toBe(false);
    expect(result.summary.tasksSkipped).toBe(1);
  });

  test("chained dependents (a->b->c) are all skipped after a fails", async () => {
    const runtime = runtimeWithSteps();
    runtime.defineQuest({
      key: "q",
      plan: () => ({
        phases: ["execution"],
        steps: [
          { id: "a", uses: "fail", input: {} },
          { id: "b", uses: "noop", input: {}, dependsOn: ["a"] },
          { id: "c", uses: "noop", input: {}, dependsOn: ["b"] },
        ],
      }),
    });

    const result = await runtime.execute(await runtime.plan("q", "x"));
    const byId = Object.fromEntries(result.steps.map((s) => [s.id, s.status]));
    expect(byId).toEqual({ a: "failed", b: "skipped", c: "skipped" });
  });

  test("an independent parallel step still runs when an unrelated step fails", async () => {
    const runtime = runtimeWithSteps();
    let independentRan = false;
    runtime.defineCapability({
      key: "independent",
      execute: async () => {
        independentRan = true;
        return { ok: true };
      },
    });
    runtime.defineQuest({
      key: "q",
      plan: () => ({
        phases: ["execution"],
        steps: [
          { id: "a", uses: "fail", input: {} },
          { id: "b", uses: "noop", input: {}, dependsOn: ["a"] },
          { id: "x", uses: "independent", input: {} },
        ],
      }),
    });

    const result = await runtime.execute(await runtime.plan("q", "x"));
    const byId = Object.fromEntries(result.steps.map((s) => [s.id, s.status]));
    expect(byId.a).toBe("failed");
    expect(byId.b).toBe("skipped");
    expect(byId.x).toBe("completed");
    expect(independentRan).toBe(true);
  });
});

describe("QuestRuntime — duplicate registration guards", () => {
  test("defineCapability throws on a duplicate key, naming the key", () => {
    const runtime = createQuestRuntime({ name: "t", version: "1.0.0" });
    runtime.defineCapability({ key: "dup", execute: async () => null });
    expect(() => runtime.defineCapability({ key: "dup", execute: async () => null })).toThrow(
      /already defined: "dup"/,
    );
  });

  test("defineQuest throws on a duplicate key, naming the key", () => {
    const runtime = createQuestRuntime({ name: "t", version: "1.0.0" });
    runtime.defineQuest({ key: "q1", plan: () => ({ phases: ["execution"], steps: [] }) });
    expect(() =>
      runtime.defineQuest({ key: "q1", plan: () => ({ phases: ["execution"], steps: [] }) }),
    ).toThrow(/already defined: "q1"/);
  });
});
