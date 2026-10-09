// Human- and machine-readable "Quantum Birth Certificate" for a coin.
import { SEED_TAG, deriveKeypair, fingerprint } from './core.js';
import { analyze } from './stats.js';

export function buildCertificate({ bits, meta = {}, qubits = 64 }) {
  const { address } = deriveKeypair(bits);
  const stats = analyze(bits, qubits);
  return {
    standard: 'QPC-1',
    name: meta.name ?? null,
    symbol: meta.symbol ?? null,
    address,
    fingerprint: fingerprint(bits),
    seedTag: SEED_TAG,
    quantum: {
      provider: meta.provider ?? 'IBM Quantum',
      backend: meta.backend ?? null,
      jobId: meta.jobId ?? null,
      qubits,
      shots: Math.floor(bits.length / qubits),
      bits: bits.length,
      circuit: meta.circuit ?? null,
    },
    randomness: Object.fromEntries(stats.tests.map((t) => [t.name, { value: t.value, p: t.p, pass: t.pass }])),
    verify: [
      'sha256(bits) == fingerprint',
      `ed25519_pubkey(sha256("${SEED_TAG}" + bits)) == address`,
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function certificateMarkdown(c) {
  const row = (k, v) => `| ${k} | ${v ?? '—'} |`;
  const tests = Object.entries(c.randomness)
    .map(([k, v]) => `| ${k} | ${v.value} | ${v.p == null ? '—' : v.p.toFixed(4)} | ${v.pass ? '✅' : '⚠️'} |`).join('\n');
  return `# ⚛️ Quantum Birth Certificate — ${c.symbol ? '$' + c.symbol : c.address}

| Field | Value |
|---|---|
${row('Standard', c.standard)}
${row('Name', c.name)}
${row('Mint address (CA)', '`' + c.address + '`')}
${row('Pre-launch fingerprint', '`' + c.fingerprint + '`')}
${row('Seed tag', '`' + c.seedTag + '`')}
${row('Quantum provider', c.quantum.provider)}
${row('Backend', c.quantum.backend)}
${row('Job ID', c.quantum.jobId ? '`' + c.quantum.jobId + '`' : null)}
${row('Qubits × shots', `${c.quantum.qubits} × ${c.quantum.shots} = ${c.quantum.bits.toLocaleString('en-US')} bits`)}
${row('Circuit', c.quantum.circuit)}

## Randomness health

| Test | Result | p-value | Status |
|---|---|---|---|
${tests}

## Verify it yourself

\`\`\`bash
npx qpc verify --bits bits.txt --fingerprint ${c.fingerprint} --address ${c.address}
\`\`\`
`;
}
