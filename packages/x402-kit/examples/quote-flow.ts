import { createQuote, withProof } from "../src";

const quote = createQuote({
  amount: "0.02",
  asset: "USDC",
  chain: "solana",
  questId: "quest_abc",
  planHash: "plan_xyz",
});

const payload = withProof(
  quote,
  {
    signature: "signed_by_wallet",
    wallet: "DemoWallet11111111111111111111111111111",
  },
  { objective: "Create a Nexus investor brief" },
);

console.log({ quote, payload });
