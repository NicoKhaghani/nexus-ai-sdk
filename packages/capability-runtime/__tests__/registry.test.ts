import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { CapabilityRegistry } from "../src";

describe("CapabilityRegistry", () => {
  test("enforces input and output schemas on invoke", async () => {
    const reg = new CapabilityRegistry();
    reg.register({
      metadata: { key: "upper", tags: ["text"] },
      input: z.object({ s: z.string() }),
      output: z.object({ s: z.string() }),
      execute: async ({ s }) => ({ s: s.toUpperCase() }),
    });

    expect(await reg.invoke("upper", { s: "hi" })).toEqual({ s: "HI" });
    await expect(reg.invoke("upper", { s: 123 })).rejects.toThrow();
  });

  test("routes by tag", () => {
    const reg = new CapabilityRegistry();
    reg.register({ metadata: { key: "a", tags: ["text"] }, execute: async () => null });
    reg.register({ metadata: { key: "b", tags: ["media"] }, execute: async () => null });
    expect(reg.byTag("text").map((c) => c.metadata.key)).toEqual(["a"]);
  });

  test("rejects duplicate registration and unknown invoke", async () => {
    const reg = new CapabilityRegistry();
    reg.register({ metadata: { key: "a" }, execute: async () => null });
    expect(() => reg.register({ metadata: { key: "a" }, execute: async () => null })).toThrow(
      /already registered/i,
    );
    await expect(reg.invoke("ghost", {})).rejects.toThrow(/unknown capability/i);
  });
});
