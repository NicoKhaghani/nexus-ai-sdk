import { CapabilityRegistry } from "../src";

const registry = new CapabilityRegistry();

registry.register({
  metadata: {
    key: "text.generate",
    title: "Text Generator",
    description: "Simple text capability example",
  },
  async execute(input: { prompt: string }) {
    return { text: `Echo: ${input.prompt}` };
  },
});

console.log(registry.list());
