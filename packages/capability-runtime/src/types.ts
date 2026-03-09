import { z } from "zod";

export interface CapabilityMetadata {
  key: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface CapabilityAdapter<I = unknown, O = unknown> {
  metadata: CapabilityMetadata;
  input?: z.ZodType<I>;
  output?: z.ZodType<O>;
  execute: (input: I) => Promise<O>;
}
