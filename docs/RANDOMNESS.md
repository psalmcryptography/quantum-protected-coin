# 📊 Randomness checks

`qpc analyze` runs quick sanity checks inspired by NIST SP 800-22. They detect broken or fake data, not certify a random number generator.

| Test | What it catches | Pass rule |
|---|---|---|
| Frequency (monobit) | too many 0s or 1s overall | p ≥ 0.01 |
| Runs | bits that alternate too much or too little | p ≥ 0.01 |
| Longest run | suspicious long streaks | ≤ 2 × log₂(n) |
| Byte entropy | low-diversity data (e.g. repeated pattern) | ≥ 90 % of max for the sample size |
| Per-qubit bias | broken qubits | ≤ 2 qubits with p < 0.001 |

## Why is byte entropy below 8?

With only 1,024 bytes, even perfect randomness measures ~7.8 bits/byte because some byte values simply don’t appear. 7.78 is exactly what an ideal source gives at this sample size.

## Why are some qubits biased?

Real superconducting qubits have readout errors and relaxation (|1⟩ decays to |0⟩), so individual qubits drift from 50 %. On `$QUANTUM`, qubit 15 read `1` in 84 % of shots. That is normal hardware behaviour — and the derivation hashes all bits with SHA-256, which spreads the remaining entropy (thousands of bits) evenly into a 256-bit seed.

## $QUANTUM results

| Test | Result | p |
|---|---|---|
| Frequency | 50.61 % ones | 0.269 |
| Runs | 4,107 (≈4,095) | 0.798 |
| Longest run | 17 | — |
| Byte entropy | 7.782 bits | — |
| Per-qubit bias | 1 / 64 flagged (q15) | — |

![heatmap](../assets/qubit-heatmap.svg)
