import type { CapabilityAdapter } from "./types";

export class CapabilityRegistry {
  private readonly items = new Map<string, CapabilityAdapter>();

  register<I, O>(adapter: CapabilityAdapter<I, O>) {
    if (this.items.has(adapter.metadata.key)) {
      throw new Error(`Capability already registered: ${adapter.metadata.key}`);
    }
    this.items.set(adapter.metadata.key, adapter as CapabilityAdapter);
    return adapter;
  }

  get(key: string) {
    return this.items.get(key);
  }

  has(key: string) {
    return this.items.has(key);
  }

  list() {
    return [...this.items.values()];
  }

  /** Route to capabilities advertising a given tag (e.g. "text", "media"). */
  byTag(tag: string) {
    return this.list().filter((a) => a.metadata.tags?.includes(tag));
  }

  /**
   * Invoke a capability with schema enforcement on both ends. Throws if the
   * capability is unknown or if input/output fail their declared zod schema.
   */
  async invoke<O = unknown>(key: string, input: unknown): Promise<O> {
    const adapter = this.items.get(key);
    if (!adapter) throw new Error(`Unknown capability: ${key}`);

    const parsedInput = adapter.input ? adapter.input.parse(input) : input;
    const output = await adapter.execute(parsedInput);
    return (adapter.output ? adapter.output.parse(output) : output) as O;
  }
}
