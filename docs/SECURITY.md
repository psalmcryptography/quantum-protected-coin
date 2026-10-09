# 🛡️ Security model

## What QPC guarantees

| Property | Mechanism |
|---|---|
| **Unchosen address** — the creator could not pick the address | Address is a hash-derived function of quantum outcomes |
| **Unchanged data** — bits weren’t swapped after launch | SHA-256 commitment posted before the mint existed |
| **Transparent origin** | Raw bits, provider, backend and job id are public |
| **Fixed supply** | Mint authority revoked in the same launch |
| **No freezing** | Freeze authority never set |

## The revealed key

After reveal, anyone can compute the ed25519 secret key of the mint address. This is safe because:

1. The mint account already exists — the key cannot create it again.
2. A Solana mint account’s own key has **no power** over the token. Power lives in the *mint authority*, *freeze authority* and *metadata update authority*.
3. `qpc launch` sets all authorities to your wallet (never the quantum key) and revokes mint & freeze authority.

> ⚠️ Never send SOL or tokens *to* the quantum address as if it were a wallet — since its key is public, anyone could move them.

## Front-running

Between commit and launch, the bits are the only secret. If they leak, someone can create an account at your address first. Mitigations:

- keep `quantum/out/` out of git (default `.gitignore`)
- launch soon after committing
- `qpc launch` refuses if an account already exists — if that happens, generate new bits and re-commit

## Quantum computers and Solana signatures

Solana wallets use ed25519 signatures. A large fault-tolerant quantum computer running Shor’s algorithm could, in the future, derive private keys from public keys. **No token can fix this on its own** — it requires a network-level move to post-quantum signatures, which Solana developers are actively researching (e.g. hash-based Winternitz vaults and post-quantum signature testnets).

QPC is honest about this: it makes the coin *quantum-born and provably fair*, not immune to future quantum attacks on the whole chain. Our roadmap includes an optional Winternitz vault for treasury funds.

## Trust assumptions

| You trust… | …that | Can you check? |
|---|---|---|
| SHA-256 | it is collision-resistant | yes — universally accepted |
| The commitment timestamp | the fingerprint was posted before the mint’s creation slot | yes — compare X/GitHub timestamp to the mint’s first transaction |
| The quantum provider | the bits really came from a QPU | partially — job id is published; hardware bias patterns (see heatmap) are typical of real devices |

## Reporting a vulnerability

Please do not open a public issue. DM [@QuantumCoin_sol](https://x.com/QuantumCoin_sol) or use GitHub’s private vulnerability reporting.
