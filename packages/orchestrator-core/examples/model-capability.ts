import { z } from "zod";
import { createQuestRuntime } from "../src";

/**
 * Extended Mode example: a model-backed `text.generate` capability, a parallel
 * `media.caption` capability that depends on the draft, and a quest that fans
 * out then assembles.
 *
 * Nexus AI orchestrates capabilities without requiring external providers. This
 * example opts into Extended Mode and shows an optional Anthropic integration
 * when ANTHROPIC_API_KEY is set; otherwise it falls back to a deterministic
 * transform so the example runs in CI without any external API.
 */

const runtime = createQuestRuntime({
  name: "demo-runtime",
  version: "0.1.0",
  description: "Extended Mode example with optional model-backed capability",
  executionMode: "extended",
});

runtime.defineCapability({
  key: "text.generate",
  input: z.object({ prompt: z.string().min(1) }),
  output: z.object({ text: z.string() }),
  async execute({ prompt }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { text: `[offline] structured response for: ${prompt}` };
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");
    return { text };
  },
});

runtime.defineCapability({
  key: "media.caption",
  input: z.object({ source: z.string() }),
  output: z.object({ caption: z.string() }),
  // consumes the draft from the dependency via ctx.outputs
  async execute(_input, ctx) {
    const draft = (ctx.outputs.draft as { text?: string } | undefined)?.text ?? "";
    return { caption: draft.slice(0, 80) };
  },
});

runtime.defineQuest({
  key: "investor.onepager",
  plan: async ({ objective }) => ({
    phases: ["interpretation", "planning", "execution", "verification", "assembly", "delivered"],
    steps: [
      { id: "draft", uses: "text.generate", input: { prompt: objective } },
      { id: "caption", uses: "media.caption", input: { source: "draft" }, dependsOn: ["draft"] },
    ],
    deliverable: { from: "draft" },
  }),
});

if (import.meta.main) {
  const unsubscribe = runtime.on((e) => console.log("event:", JSON.stringify(e)));
  const plan = await runtime.plan("investor.onepager", "One-pager for a Web3 AI orchestrator");
  const result = await runtime.execute(plan);
  unsubscribe();
  console.log("summary:", result.summary);
  console.log("deliverable:", result.deliverable);
}

export default runtime;
