import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { launchCoin } from '../src/mint.js';
import { loadBits } from '../src/core.js';

const bits = loadBits('examples/quantum/bits.txt');
const coin = { name: 'Quantum', symbol: 'QUANTUM', decimals: 6, supply: 1_000_000_000, expectedFingerprint: '15f22c99b64e31521c288bbb0e98ad486e71b049c6e5916c93b7270fb34711fa' };

test('dry-run launch builds signed transactions at the quantum address', async () => {
  const s = await launchCoin({ bits, coin, wallet: Keypair.generate(), dryRun: true });
  assert.equal(s.address, 'AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ');
  assert.equal(s.mintAuthority, 'revoked');
  assert.equal(s.freezeAuthority, 'none');
  assert.equal(s.signatures.length, 2);
});

test('launch refuses bits that do not match the commitment', async () => {
  await assert.rejects(
    launchCoin({ bits: (bits[0] === '1' ? '0' : '1') + bits.slice(1), coin, wallet: Keypair.generate(), dryRun: true }),
    /do not match the committed fingerprint/,
  );
});

test('classic SPL mode also works', async () => {
  const s = await launchCoin({ bits, coin: { ...coin, program: 'spl' }, wallet: Keypair.generate(), dryRun: true });
  assert.equal(s.tokenStandard, 'SPL Token (classic)');
});
