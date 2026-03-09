import { describe, expect, test } from "bun:test";
import { createQuote } from "../src";

describe("createQuote", () => {
  test("returns a valid quote object", () => {
    const quote = createQuote({
      amount: "0.02",
      asset: "USDC",
      chain: "solana",
      questId: "quest_123",
    });

    expect(quote.questId).toBe("quest_123");
  });
});
