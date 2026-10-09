# ⚛️ Quantum Birth Certificate — $QUANTUM

| Field | Value |
|---|---|
| Standard | QPC-1 |
| Name | Quantum |
| Mint address (CA) | `AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ` |
| Pre-launch fingerprint | `15f22c99b64e31521c288bbb0e98ad486e71b049c6e5916c93b7270fb34711fa` |
| Seed tag | `quantum-mint-seed-v1:` |
| Quantum provider | IBM Quantum |
| Backend | ibm_marrakesh |
| Job ID | `db470m84qg6s73c1o67g` |
| Qubits × shots | 64 × 128 = 8,192 bits |
| Circuit | — |

## Randomness health

| Test | Result | p-value | Status |
|---|---|---|---|
| Frequency (monobit) | 50.61% ones | 0.2692 | ✅ |
| Runs | 4107 (≈4095 expected) | 0.7975 | ✅ |
| Longest run | 17 (≈13 expected) | — | ✅ |
| Byte entropy | 7.782 / 8.000 bits | — | ✅ |
| Per-qubit bias | 1 of 64 qubits flagged | — | ✅ |

## Verify it yourself

```bash
npx qpc verify --bits bits.txt --fingerprint 15f22c99b64e31521c288bbb0e98ad486e71b049c6e5916c93b7270fb34711fa --address AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ
```
