import { createQuestRuntime } from "../src";

const runtime = createQuestRuntime({
  name: "demo-runtime",
  version: "0.1.0",
  description: "Minimal Nexus runtime example",
});

runtime.defineCapability({
  key: "text.generate",
  async execute(input: { prompt: string }) {
    return { text: `Generated output for: ${input.prompt}` };
  },
});

runtime.defineQuest({
  key: "investor.onepager",
  plan: ({ objective }) => ({
    phases: ["interpretation", "planning", "execution", "verification", "assembly", "delivered"],
    steps: [{ id: "draft", uses: "text.generate", input: { prompt: objective } }],
    deliverable: { from: "draft" },
  }),
});

const plan = await runtime.plan("investor.onepager", "Write a Nexus AI investor one-pager");
const result = await runtime.execute(plan);

console.log(plan);
console.log(result);
