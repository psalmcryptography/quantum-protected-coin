// Launch a Quantum Protected Coin on Solana.
//
// The mint ADDRESS is the keypair derived from the quantum bits.
// The mint AUTHORITY is always your own wallet (never the quantum keypair),
// because after the bits are revealed anyone can rebuild the quantum keypair.
// Mint and freeze authorities are revoked by default -> fixed supply forever.

import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, clusterApiUrl, sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  AuthorityType, ExtensionType, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, TYPE_SIZE, LENGTH_SIZE,
  MINT_SIZE, createAssociatedTokenAccountIdempotentInstruction, createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction, createMintToInstruction, createSetAuthorityInstruction,
  getAssociatedTokenAddressSync, getMintLen,
} from '@solana/spl-token';
import { createInitializeInstruction, createUpdateAuthorityInstruction, pack } from '@solana/spl-token-metadata';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { deriveKeypair, fingerprint } from './core.js';

export function loadWallet(path) {
  const p = path.replace(/^~(?=$|\/)/, homedir());
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, 'utf8'))));
}

export function rpcFor(network) {
  if (/^https?:\/\//.test(network)) return network;
  return clusterApiUrl(network);
}

// Same formula as the runtime: (data_len + 128 bytes account overhead) * 3480 lamports/byte-year * 2 years
const rentExempt = (space) => (space + 128) * 3480 * 2;

/**
 * Build (and optionally send) the launch transactions.
 * @returns summary object describing everything that was / would be done.
 */
export async function launchCoin({ bits, coin, wallet, network = 'devnet', dryRun = false, log = () => {} }) {
  const quantum = deriveKeypair(bits);
  const mint = Keypair.fromSecretKey(Uint8Array.from(quantum.secretKey));
  if (mint.publicKey.toBase58() !== quantum.address) throw new Error('Internal error: keypair mismatch');

  if (coin.expectedFingerprint && coin.expectedFingerprint.toLowerCase() !== fingerprint(bits)) {
    throw new Error(`Bits do not match the committed fingerprint ${coin.expectedFingerprint}. Refusing to launch.`);
  }

  const program = coin.program === 'spl' ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
  const withMetadata = program.equals(TOKEN_2022_PROGRAM_ID);
  const decimals = coin.decimals ?? 6;
  const rawSupply = BigInt(coin.supply ?? 1_000_000_000) * 10n ** BigInt(decimals);
  const payer = wallet.publicKey;

  const metadata = {
    mint: mint.publicKey, updateAuthority: payer, name: coin.name, symbol: coin.symbol, uri: coin.uri ?? '',
    additionalMetadata: [
      ['quantum_fingerprint', fingerprint(bits)],
      ['quantum_seed_tag', 'quantum-mint-seed-v1'],
      ...(coin.ibmJobId ? [['ibm_job', coin.ibmJobId]] : []),
      ...(coin.backend ? [['quantum_backend', coin.backend]] : []),
    ],
  };

  const mintLen = withMetadata ? getMintLen([ExtensionType.MetadataPointer]) : MINT_SIZE;
  const metadataLen = withMetadata ? TYPE_SIZE + LENGTH_SIZE + pack(metadata).length : 0;
  const lamports = rentExempt(mintLen + metadataLen);

  // --- Tx 1: create the mint at the quantum address --------------------------------------
  const tx1 = new Transaction().add(
    SystemProgram.createAccount({ fromPubkey: payer, newAccountPubkey: mint.publicKey, space: mintLen, lamports, programId: program }),
  );
  if (withMetadata) tx1.add(createInitializeMetadataPointerInstruction(mint.publicKey, payer, mint.publicKey, program));
  tx1.add(createInitializeMintInstruction(mint.publicKey, decimals, payer, coin.revokeFreeze === false ? payer : null, program));
  if (withMetadata) {
    tx1.add(createInitializeInstruction({
      programId: program, metadata: mint.publicKey, updateAuthority: payer, mint: mint.publicKey,
      mintAuthority: payer, name: metadata.name, symbol: metadata.symbol, uri: metadata.uri,
    }));
  }

  // --- Tx 2: mint the full supply, then lock everything ----------------------------------
  const ata = getAssociatedTokenAddressSync(mint.publicKey, payer, false, program);
  const tx2 = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(payer, ata, payer, mint.publicKey, program),
    createMintToInstruction(mint.publicKey, ata, payer, rawSupply, [], program),
  );
  if (coin.revokeMint !== false) tx2.add(createSetAuthorityInstruction(mint.publicKey, payer, AuthorityType.MintTokens, null, [], program));
  if (withMetadata && coin.revokeUpdate === true) {
    tx2.add(createUpdateAuthorityInstruction({ programId: program, metadata: mint.publicKey, oldAuthority: payer, newAuthority: null }));
  }

  const summary = {
    network, dryRun, address: mint.publicKey.toBase58(), program: program.toBase58(),
    tokenStandard: withMetadata ? 'Token-2022 + on-chain metadata' : 'SPL Token (classic)',
    name: coin.name, symbol: coin.symbol, decimals, supply: String(coin.supply ?? 1_000_000_000),
    payer: payer.toBase58(), holderAccount: ata.toBase58(), rentLamports: lamports,
    mintAuthority: coin.revokeMint !== false ? 'revoked' : payer.toBase58(),
    freezeAuthority: coin.revokeFreeze === false ? payer.toBase58() : 'none',
    updateAuthority: withMetadata ? (coin.revokeUpdate === true ? 'revoked' : payer.toBase58()) : 'n/a',
    signatures: [],
  };

  if (dryRun) {
    const fakeHash = PublicKey.default.toBase58();
    for (const [tx, signers] of [[tx1, [wallet, mint]], [tx2, [wallet]]]) {
      tx.recentBlockhash = fakeHash; tx.feePayer = payer; tx.sign(...signers);
      summary.signatures.push(`(dry-run) ${tx.serialize().length} bytes, ${tx.instructions.length} instructions`);
    }
    return summary;
  }

  const connection = new Connection(rpcFor(network), 'confirmed');
  const existing = await connection.getAccountInfo(mint.publicKey);
  if (existing) throw new Error(`Account ${summary.address} already exists on ${network}. Someone used these bits already — do NOT reuse revealed bits.`);
  const balance = await connection.getBalance(payer);
  if (balance < lamports + 20_000_000) throw new Error(`Wallet balance ${balance / 1e9} SOL is too low (need ≈ ${(lamports + 20_000_000) / 1e9} SOL).`);

  log('Creating mint at quantum address…');
  summary.signatures.push(await sendAndConfirmTransaction(connection, tx1, [wallet, mint]));
  log('Minting supply and locking authorities…');
  summary.signatures.push(await sendAndConfirmTransaction(connection, tx2, [wallet]));
  return summary;
}
