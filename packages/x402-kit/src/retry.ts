import type { RetryPayload, X402Proof, X402Quote } from "./types";

export function withProof<T>(quote: X402Quote, proof: X402Proof, payload: T): RetryPayload<T> {
  return { quote, proof, payload };
}
