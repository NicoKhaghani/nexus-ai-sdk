export interface X402Quote {
  amount: string;
  asset: string;
  chain: string;
  questId: string;
  expiresAt: string;
  planHash?: string;
}

export interface X402Proof {
  signature: string;
  wallet: string;
  txHash?: string;
}

export interface RetryPayload<T = unknown> {
  quote: X402Quote;
  proof: X402Proof;
  payload: T;
}
