# QPC-1 — Quantum Protected Coin protocol

**Status:** Stable · **Version:** 1 · **Reference coin:** `$QUANTUM` (`AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ`)

## 1. Overview

QPC-1 defines how a Solana token mint address is derived from quantum measurement data, and how that derivation is committed before launch and verified after it.

## 2. Quantum measurement

| Parameter | Recommended | Notes |
|---|---|---|
| Provider | IBM Quantum | any gate-based QPU works; record the provider |
| Qubits | 64 | |
| Shots | 128 | 64 × 128 = 8,192 bits |
| Circuit | `H` on every qubit, then measure | uniform superposition → each bit is a fair quantum coin flip |
| Output | bitstrings per shot, concatenated in shot order | |

The `bits` value is an ASCII string of exactly the characters `0` and `1`, with no separators. Implementations MUST strip whitespace, newlines and commas before hashing.

Bit ordering inside each shot is whatever the provider returns (Qiskit returns qubit *n−1* first). It does not need to be canonical — it only needs to be the same string that was committed.

## 3. Derivation

```
fingerprint = hex( SHA-256( bits ) )
seed        = SHA-256( "quantum-mint-seed-v1:" || bits )      // 32 bytes
keypair     = ed25519_from_seed( seed )                      // RFC 8032
address     = base58( keypair.public_key )                   // Solana address
```

All strings are UTF-8 (ASCII). `||` is concatenation. The tag `quantum-mint-seed-v1:` includes the trailing colon.

## 4. Lifecycle

| Phase | Creator publishes | Must remain secret |
|---|---|---|
| **Commit** | `fingerprint`, bit count, provider, backend, (optional) job id | `bits`, `address` |
| **Launch** | mint account created at `address` | `bits` |
| **Reveal** | full `bits`, certificate | — |

Revealing `bits` before the mint account exists allows a third party to create an account at `address` first (front-running). Reference tooling refuses to launch if an account already exists.

## 5. Authorities

The keypair derived in §3 MUST NOT be used as mint authority, freeze authority or metadata update authority, because its secret key becomes public at reveal. Reference tooling uses the creator's wallet as authority and revokes mint and freeze authority by default.

## 6. On-chain metadata (Token-2022)

| Key | Value |
|---|---|
| `quantum_fingerprint` | fingerprint (hex) |
| `quantum_seed_tag` | `quantum-mint-seed-v1` |
| `ibm_job` | provider job id (optional) |
| `quantum_backend` | backend name (optional) |

## 7. Verification

A coin is **QPC-1 verified** when, for the revealed bits:

1. `SHA-256(bits)` equals the fingerprint published before the mint's creation slot, and
2. the derived address equals the token mint address.

### Reference implementation (Python, 12 lines)

```python
import hashlib, base58
from nacl.signing import SigningKey

bits = open("bits.txt").read().strip()
fp   = hashlib.sha256(bits.encode()).hexdigest()
seed = hashlib.sha256(("quantum-mint-seed-v1:" + bits).encode()).digest()
addr = base58.b58encode(bytes(SigningKey(seed).verify_key)).decode()

assert fp   == "15f22c99b64e31521c288bbb0e98ad486e71b049c6e5916c93b7270fb34711fa"
assert addr == "AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ"
print("QPC-1 verified")
```

## 8. Test vectors

| Input | fingerprint | address |
|---|---|---|
| `examples/quantum/bits.txt` | `15f22c99b64e31521c288bbb0e98ad486e71b049c6e5916c93b7270fb34711fa` | `AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ` |
| same, first bit flipped | different | different |
