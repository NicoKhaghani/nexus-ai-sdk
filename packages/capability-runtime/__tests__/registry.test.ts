import { describe, expect, test } from "bun:test";
import { CapabilityRegistry } from "../src";

describe("CapabilityRegistry", () => {
  test("registers and retrieves adapters", () => {
    const registry = new CapabilityRegistry();

    registry.register({
      metadata: { key: "text.generate" },
      async execute(input: { prompt: string }) {
        return { text: input.prompt };
      },
    });

    expect(registry.get("text.generate")).toBeDefined();
  });
});
