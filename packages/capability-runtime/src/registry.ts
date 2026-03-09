import type { CapabilityAdapter } from "./types";

export class CapabilityRegistry {
  private readonly items = new Map<string, CapabilityAdapter>();

  register<I, O>(adapter: CapabilityAdapter<I, O>) {
    this.items.set(adapter.metadata.key, adapter as CapabilityAdapter);
    return adapter;
  }

  get(key: string) {
    return this.items.get(key);
  }

  list() {
    return [...this.items.values()];
  }
}
