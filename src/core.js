// Core of the Quantum Protected Coin (QPC) protocol.
//
//   bits        = 8,192 raw measurement bits from a real quantum computer
//   fingerprint = SHA-256(bits)                              -> published BEFORE launch (commit)
//   seed        = SHA-256("quantum-mint-seed-v1:" + bits)    -> ed25519 seed
//   address     = ed25519 public key of that seed (base58)   -> the token mint address (CA)
//
// This is byte-for-byte compatible with the scheme used by $QUANTUM
// (AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ).

import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const SEED_TAG = 'quantum-mint-seed-v1:';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

/** Base58 (Bitcoin / Solana alphabet). */
export function base58(bytes) {
  let n = BigInt('0x' + (Buffer.from(bytes).toString('hex') || '0'));
  let out = '';
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = '1' + out; }
  return out;
}

/**
 * Normalise a bit source. Accepts:
 *  - a plain string of 0/1 (whitespace, commas, newlines ignored)
 *  - a JSON file produced by quantum/generate_bits.py ({ "shots": ["0101…", …] } or { "bits": "…" })
 */
export function normalizeBits(raw) {
  const text = String(raw).trim();
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    if (typeof j.bits === 'string') return normalizeBits(j.bits);
    if (Array.isArray(j.shots)) return normalizeBits(j.shots.join(''));
    throw new Error('JSON bit file must contain "bits" (string) or "shots" (array of strings)');
  }
  const bits = text.replace(/[\s,]/g, '');
  if (!/^[01]+$/.test(bits)) throw new Error('Bit source contains characters other than 0 and 1');
  return bits;
}

export function loadBits(path) {
  return normalizeBits(readFileSync(path, 'utf8'));
}

export const sha256hex = (s) => createHash('sha256').update(s).digest('hex');

/** Commitment published before launch. */
export const fingerprint = (bits) => sha256hex(bits);

/** 32-byte ed25519 seed derived from the quantum bits. */
export function deriveSeed(bits, tag = SEED_TAG) {
  return createHash('sha256').update(tag + bits).digest();
}

/** Full keypair. secretKey is in Solana's 64-byte format (seed || pubkey). */
export function deriveKeypair(bits, tag = SEED_TAG) {
  const seed = deriveSeed(bits, tag);
  const priv = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]), format: 'der', type: 'pkcs8' });
  const publicKey = createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(12);
  return {
    seed,
    publicKey: Buffer.from(publicKey),
    secretKey: Buffer.concat([seed, publicKey]),
    address: base58(publicKey),
  };
}

/** Full verification of a launch: commit -> reveal -> address. */
export function verify({ bits, expectedFingerprint, expectedAddress, tag = SEED_TAG }) {
  const fp = fingerprint(bits);
  const { address } = deriveKeypair(bits, tag);
  const checks = [];
  if (expectedFingerprint) checks.push({ name: 'fingerprint', expected: expectedFingerprint.toLowerCase(), actual: fp, ok: fp === expectedFingerprint.toLowerCase() });
  if (expectedAddress) checks.push({ name: 'address', expected: expectedAddress, actual: address, ok: address === expectedAddress });
  return { fingerprint: fp, address, bitCount: bits.length, checks, ok: checks.length > 0 && checks.every((c) => c.ok) };
}
