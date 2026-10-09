import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base58, deriveKeypair, fingerprint, loadBits, normalizeBits, verify } from '../src/core.js';
import { analyze } from '../src/stats.js';
import { buildCertificate } from '../src/certificate.js';

const QUANTUM = {
  bits: loadBits('examples/quantum/bits.txt'),
  fingerprint: '15f22c99b64e31521c288bbb0e98ad486e71b049c6e5916c93b7270fb34711fa',
  address: 'AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ',
};

test('$QUANTUM reference bits are 64 qubits x 128 shots', () => {
  assert.equal(QUANTUM.bits.length, 8192);
});

test('$QUANTUM fingerprint matches the pre-launch commitment', () => {
  assert.equal(fingerprint(QUANTUM.bits), QUANTUM.fingerprint);
});

test('$QUANTUM bits derive exactly the published contract address', () => {
  assert.equal(deriveKeypair(QUANTUM.bits).address, QUANTUM.address);
});

test('verify() passes for the real data and fails for one flipped bit', () => {
  assert.equal(verify({ bits: QUANTUM.bits, expectedFingerprint: QUANTUM.fingerprint, expectedAddress: QUANTUM.address }).ok, true);
  const flipped = (QUANTUM.bits[0] === '0' ? '1' : '0') + QUANTUM.bits.slice(1);
  const r = verify({ bits: flipped, expectedFingerprint: QUANTUM.fingerprint, expectedAddress: QUANTUM.address });
  assert.equal(r.ok, false);
  assert.ok(r.checks.every((c) => !c.ok));
});

test('derived keypair matches @solana/web3.js', async () => {
  const { Keypair } = await import('@solana/web3.js');
  const kp = deriveKeypair(QUANTUM.bits);
  assert.equal(Keypair.fromSeed(kp.seed).publicKey.toBase58(), kp.address);
  assert.equal(Keypair.fromSecretKey(Uint8Array.from(kp.secretKey)).publicKey.toBase58(), kp.address);
});

test('normalizeBits accepts whitespace and JSON shot arrays', () => {
  assert.equal(normalizeBits('01 10\n11'), '011011');
  assert.equal(normalizeBits(JSON.stringify({ shots: ['01', '10'] })), '0110');
  assert.throws(() => normalizeBits('0102'));
});

test('base58 keeps leading zero bytes', () => {
  assert.equal(base58(Buffer.from([0, 0, 1])), '112');
});

test('reference bits pass randomness health checks', () => {
  const r = analyze(QUANTUM.bits);
  assert.equal(r.pass, true, JSON.stringify(r.tests));
});

test('certificate carries address and fingerprint', () => {
  const c = buildCertificate({ bits: QUANTUM.bits, meta: { symbol: 'QUANTUM', jobId: 'db470m84qg6s73c1o67g', backend: 'ibm_marrakesh' } });
  assert.equal(c.address, QUANTUM.address);
  assert.equal(c.fingerprint, QUANTUM.fingerprint);
  assert.equal(c.quantum.shots, 128);
});
