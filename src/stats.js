// Lightweight randomness health checks for quantum measurement bits.
// Based on NIST SP 800-22 (frequency, runs, longest run) plus per-qubit bias.
// These are sanity checks, not a full certification suite.

function erfc(x) {
  // Numerical Recipes erfc approximation (|error| < 1.2e-7)
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

const normalP = (z) => erfc(Math.abs(z) / Math.SQRT2); // two-sided

export function monobit(bits) {
  const n = bits.length;
  const ones = [...bits].filter((b) => b === '1').length;
  const s = Math.abs(2 * ones - n) / Math.sqrt(n);
  return { ones, zeros: n - ones, ratio: ones / n, p: erfc(s / Math.SQRT2) };
}

export function runs(bits) {
  const n = bits.length;
  const pi = [...bits].filter((b) => b === '1').length / n;
  let v = 1;
  for (let i = 1; i < n; i++) if (bits[i] !== bits[i - 1]) v++;
  const p = erfc(Math.abs(v - 2 * n * pi * (1 - pi)) / (2 * Math.sqrt(2 * n) * pi * (1 - pi)));
  return { runs: v, expected: Math.round(2 * n * pi * (1 - pi)), p };
}

export function longestRun(bits) {
  let best = 0, cur = 0, prev = '';
  for (const b of bits) { cur = b === prev ? cur + 1 : 1; prev = b; if (cur > best) best = cur; }
  return { longest: best, expected: Math.round(Math.log2(bits.length)) };
}

export function byteEntropy(bits) {
  const counts = new Array(256).fill(0);
  const nBytes = Math.floor(bits.length / 8);
  for (let i = 0; i < nBytes; i++) counts[parseInt(bits.slice(i * 8, i * 8 + 8), 2)]++;
  let h = 0;
  for (const c of counts) if (c) { const p = c / nBytes; h -= p * Math.log2(p); }
  return { bytes: nBytes, shannonBitsPerByte: h, maxPossible: Math.min(8, Math.log2(nBytes)) };
}

/** Bias of every individual qubit across all shots. */
export function perQubit(bits, qubits = 64) {
  const shots = Math.floor(bits.length / qubits);
  const rows = [];
  for (let q = 0; q < qubits; q++) {
    let ones = 0;
    for (let s = 0; s < shots; s++) if (bits[s * qubits + q] === '1') ones++;
    const z = (ones - shots / 2) / Math.sqrt(shots / 4);
    rows.push({ qubit: q, ones, p1: ones / shots, z, p: normalP(z) });
  }
  return { shots, qubits, rows, flagged: rows.filter((r) => r.p < 0.001).map((r) => r.qubit) };
}

export function analyze(bits, qubits = 64) {
  const m = monobit(bits), r = runs(bits), l = longestRun(bits), e = byteEntropy(bits), q = perQubit(bits, qubits);
  const tests = [
    { name: 'Frequency (monobit)', value: `${(m.ratio * 100).toFixed(2)}% ones`, p: m.p, pass: m.p >= 0.01 },
    { name: 'Runs', value: `${r.runs} (≈${r.expected} expected)`, p: r.p, pass: r.p >= 0.01 },
    { name: 'Longest run', value: `${l.longest} (≈${l.expected} expected)`, p: null, pass: l.longest <= l.expected * 2 },
    { name: 'Byte entropy', value: `${e.shannonBitsPerByte.toFixed(3)} / ${e.maxPossible.toFixed(3)} bits`, p: null, pass: e.shannonBitsPerByte >= e.maxPossible * 0.9 },
    { name: 'Per-qubit bias', value: `${q.flagged.length} of ${q.qubits} qubits flagged`, p: null, pass: q.flagged.length <= 2 },
  ];
  return { bitCount: bits.length, tests, perQubit: q, pass: tests.every((t) => t.pass) };
}
