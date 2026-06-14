import { z } from "zod";
import { CapabilityRegistry } from "../src";

const registry = new CapabilityRegistry();

registry.register({
  metadata: { key: "text.generate", title: "Text generator", tags: ["text"] },
  input: z.object({ prompt: z.string() }),
  output: z.object({ text: z.string() }),
  async execute({ prompt }) {
    return { text: `Generated: ${prompt}` };
  },
});

const out = await registry.invoke("text.generate", { prompt: "hello" });
console.log(out, registry.byTag("text").map((c) => c.metadata.key));
