# Security Policy

## Reporting
Report vulnerabilities privately via a GitHub security advisory on this repository. Please do not
open public issues for security reports. We aim to acknowledge within 72 hours.

## Scope and design notes
- **Key custody:** the SDK never holds payer private keys. Authorizations are signed by the
  integrator's wallet; the facilitator only relays signed authorizations.
- **Settlement binding:** quotes record `amount`, `payTo`, `chainId`, validity window, a single-use
  32-byte nonce, and the plan hash. The ERC-3009 signature authorizes the transfer fields
  (`from`, `to`, `value`, `validAfter`, `validBefore`, `nonce`) — it does **not** sign the plan hash.
  The plan hash must be enforced server-side against a persisted quote during verification.
- **Replay protection:** ERC-3009 nonces are single-use on-chain; the facilitator additionally
  guards against re-submitting a nonce. This guard is **in-memory and per-process — adequate for
  demo/dev only.** Production deployments must persist quote/nonce records in a shared store so
  anti-replay holds across processes and restarts.
- **Verification:** `verifyProof` recovers the EIP-712 signer and requires it to equal the claimed
  `from`; structural-only verification (no signer recovery) is available but not sufficient for
  settlement.

## Supported versions
Pre-1.0: only the latest `0.x` line receives fixes.
