#!/usr/bin/env node
// Verify every coin in registry/ and print a Markdown table (used by CI).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { loadBits, verify } from '../src/core.js';

const dir = new URL('../registry/', import.meta.url);
const rows = [];
let failed = 0;
for (const sym of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const base = new URL(`${sym}/`, dir);
  if (!existsSync(new URL('coin.json', base)) || !existsSync(new URL('bits.txt', base))) { console.error(`✖ ${sym}: needs coin.json and bits.txt`); failed++; continue; }
  const coin = JSON.parse(readFileSync(new URL('coin.json', base), 'utf8'));
  const r = verify({ bits: loadBits(new URL('bits.txt', base)), expectedFingerprint: coin.fingerprint, expectedAddress: coin.address });
  if (!r.ok) failed++;
  rows.push(`| ${r.ok ? '✅' : '❌'} | $${coin.symbol} | \`${coin.address}\` | ${coin.backend ?? '—'} | ${r.bitCount} |`);
}
console.log('| | Coin | Address | Backend | Bits |\n|:-:|---|---|---|--:|\n' + rows.join('\n'));
process.exit(failed ? 1 : 0);
