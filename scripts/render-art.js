#!/usr/bin/env node
// Render a coin's quantum bits as SVG art + a per-qubit bias heatmap.
//   node scripts/render-art.js <bits file> <out dir> [label]
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadBits, deriveKeypair } from '../src/core.js';
import { perQubit } from '../src/stats.js';

const [file = 'examples/quantum/bits.txt', outDir = 'assets', label = '$QUANTUM'] = process.argv.slice(2);
const bits = loadBits(file);
const { address } = deriveKeypair(bits);
const Q = 64, S = Math.floor(bits.length / Q);
mkdirSync(outDir, { recursive: true });
const font = `font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif"`;

// 1) Bit mosaic: columns = shots, rows = qubits
const cell = 8, padX = 40, padTop = 70;
const W = padX * 2 + S * cell, H = padTop + Q * cell + 60;
let rects = '';
for (let s = 0; s < S; s++) for (let q = 0; q < Q; q++) {
  if (bits[s * Q + q] === '1') rects += `<rect x="${padX + s * cell}" y="${padTop + q * cell}" width="${cell - 1}" height="${cell - 1}"/>`;
}
writeFileSync(`${outDir}/quantum-bits.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${bits.length} quantum bits">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${padX}" y1="${padTop}" x2="${padX + S * cell}" y2="${padTop + Q * cell}"><stop offset="0" stop-color="#7cf7ff"/><stop offset=".5" stop-color="#9d8cff"/><stop offset="1" stop-color="#ff7ad9"/></linearGradient></defs>
<rect width="${W}" height="${H}" rx="16" fill="#070a1c"/>
<rect x="${padX}" y="${padTop}" width="${S * cell}" height="${Q * cell}" fill="#10153a"/>
<text x="${padX}" y="40" ${font} font-size="20" font-weight="700" fill="#e6e9ff">${label} · ${bits.length.toLocaleString('en-US')} quantum bits</text>
<text x="${W - padX}" y="40" ${font} font-size="13" text-anchor="end" fill="#8a90b8">${S} shots → · ${Q} qubits ↓</text>
<g fill="url(#g)">${rects}</g>
<text x="${padX}" y="${H - 22}" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="14" fill="#7cf7ff">→ ${address}</text>
</svg>\n`);

// 2) Per-qubit bias heatmap (8 x 8)
const pq = perQubit(bits, Q);
const c2 = 58, hx = 40, hy = 80, HW = hx * 2 + 8 * c2, HH = hy + 8 * c2 + 70;
const color = (p1) => {
  const d = Math.max(-1, Math.min(1, (p1 - 0.5) / 0.25));
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  return d >= 0 ? `rgb(${mix(22, 255, d)},${mix(28, 122, d)},${mix(70, 217, d)})` : `rgb(${mix(22, 124, -d)},${mix(28, 247, -d)},${mix(70, 255, -d)})`;
};
let cells = '';
pq.rows.forEach((r, i) => {
  const x = hx + (i % 8) * c2, y = hy + Math.floor(i / 8) * c2;
  cells += `<rect x="${x}" y="${y}" width="${c2 - 4}" height="${c2 - 4}" rx="8" fill="${color(r.p1)}"${Math.abs(r.z) > 3 ? ' stroke="#fff" stroke-width="2"' : ''}/>`;
  cells += `<text x="${x + (c2 - 4) / 2}" y="${y + 24}" text-anchor="middle" font-size="11" fill="#e6e9ff" fill-opacity=".7">q${r.qubit}</text>`;
  cells += `<text x="${x + (c2 - 4) / 2}" y="${y + 42}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${Math.round(r.p1 * 100)}%</text>`;
});
writeFileSync(`${outDir}/qubit-heatmap.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${HW}" height="${HH}" viewBox="0 0 ${HW} ${HH}" role="img" aria-label="Per-qubit probability of measuring 1">
<rect width="${HW}" height="${HH}" rx="16" fill="#070a1c"/>
<g ${font}>
<text x="${hx}" y="40" font-size="20" font-weight="700" fill="#e6e9ff">P(|1⟩) per qubit</text>
<text x="${hx}" y="62" font-size="13" fill="#8a90b8">${label} · ${S} shots each · ideal = 50%</text>
${cells}
<text x="${hx}" y="${HH - 28}" font-size="12" fill="#8a90b8">cyan = leans to 0 · pink = leans to 1 · outlined = |z| &gt; 3 (real hardware bias)</text>
</g>
</svg>\n`);
console.log(`wrote ${outDir}/quantum-bits.svg and ${outDir}/qubit-heatmap.svg for ${address}`);
