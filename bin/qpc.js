#!/usr/bin/env node
// qpc — Quantum Protected Coin command line
import { Command } from 'commander';
import pc from 'picocolors';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadBits, deriveKeypair, fingerprint, verify } from '../src/core.js';
import { analyze } from '../src/stats.js';
import { buildCertificate, certificateMarkdown } from '../src/certificate.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const atom = pc.cyan('⚛');
const banner = () => console.log(`\n${atom}  ${pc.bold('Quantum Protected Coin')} ${pc.dim('v' + pkg.version)}\n`);
const kv = (k, v) => console.log(`  ${pc.dim(k.padEnd(18))} ${v}`);
const fail = (msg) => { console.error(pc.red(`\n✖ ${msg}\n`)); process.exit(1); };

const program = new Command();
program.name('qpc').description('Create and verify Solana coins whose address is born from real quantum measurements').version(pkg.version);

program.command('derive')
  .description('derive the coin address from quantum bits')
  .requiredOption('-b, --bits <file>', 'bit file (.txt of 0/1 or .json from generate_bits.py)')
  .action(({ bits: file }) => {
    banner();
    const bits = loadBits(file);
    const kp = deriveKeypair(bits);
    kv('bits', bits.length.toLocaleString('en-US'));
    kv('fingerprint', pc.yellow(fingerprint(bits)));
    kv('coin address', pc.green(pc.bold(kp.address)));
    console.log();
  });

program.command('commit')
  .description('produce the pre-launch commitment (publish the fingerprint, keep the bits secret)')
  .requiredOption('-b, --bits <file>', 'bit file')
  .option('--job <id>', 'IBM Quantum job id')
  .option('--backend <name>', 'quantum backend, e.g. ibm_marrakesh')
  .option('-o, --out <file>', 'write commitment JSON', 'commitment.json')
  .action(({ bits: file, job, backend, out }) => {
    banner();
    const bits = loadBits(file);
    const fp = fingerprint(bits);
    const c = { standard: 'QPC-1', fingerprint: fp, bits: bits.length, ibmJobId: job ?? null, backend: backend ?? null, committedAt: new Date().toISOString() };
    writeFileSync(out, JSON.stringify(c, null, 2) + '\n');
    kv('fingerprint', pc.yellow(fp));
    kv('saved', out);
    console.log(`\n${pc.bold('Post this BEFORE launch:')}\n`);
    console.log(pc.cyan(`  Quantum commitment for our coin:\n  SHA-256 = ${fp}\n  ${bits.length} bits${job ? ` · IBM job ${job}` : ''}${backend ? ` on ${backend}` : ''}\n  Raw bits will be revealed after launch. #QPC`));
    console.log(pc.red(`\n  ⚠  Do NOT publish the bits or the address yet — anyone holding the bits can claim the address first.\n`));
  });

program.command('verify')
  .description('verify a coin: bits -> fingerprint -> address')
  .requiredOption('-b, --bits <file>', 'revealed bit file')
  .option('-f, --fingerprint <sha256>', 'fingerprint published before launch')
  .option('-a, --address <base58>', 'token contract address (CA)')
  .option('--json', 'machine-readable output')
  .action(({ bits: file, fingerprint: fp, address, json }) => {
    if (!fp && !address) fail('Provide --fingerprint and/or --address to verify against.');
    const r = verify({ bits: loadBits(file), expectedFingerprint: fp, expectedAddress: address });
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1); }
    banner();
    for (const c of r.checks) {
      console.log(`  ${c.ok ? pc.green('✔') : pc.red('✖')} ${c.name.padEnd(12)} ${c.ok ? pc.dim(c.actual) : `${pc.red(c.actual)}\n     expected ${c.expected}`}`);
    }
    console.log(r.ok ? pc.green(pc.bold('\n  VERIFIED — this coin was born from these quantum bits.\n')) : pc.red(pc.bold('\n  NOT VERIFIED\n')));
    process.exit(r.ok ? 0 : 1);
  });

program.command('analyze')
  .description('run randomness health checks on the bits')
  .requiredOption('-b, --bits <file>', 'bit file')
  .option('-q, --qubits <n>', 'qubits per shot', '64')
  .action(({ bits: file, qubits }) => {
    banner();
    const r = analyze(loadBits(file), Number(qubits));
    for (const t of r.tests) {
      console.log(`  ${t.pass ? pc.green('✔') : pc.yellow('!')} ${t.name.padEnd(22)} ${t.value.padEnd(30)} ${t.p == null ? '' : pc.dim('p=' + t.p.toFixed(4))}`);
    }
    const bar = r.perQubit.rows.map((q) => (Math.abs(q.z) > 3 ? pc.red('█') : Math.abs(q.z) > 2 ? pc.yellow('▓') : pc.green('░'))).join('');
    console.log(`\n  per-qubit bias  ${bar}`);
    console.log(r.pass ? pc.green('\n  Bits look healthy.\n') : pc.yellow('\n  Some checks need attention (see docs/RANDOMNESS.md).\n'));
  });

program.command('certificate')
  .description('generate a Quantum Birth Certificate (JSON + Markdown)')
  .requiredOption('-b, --bits <file>', 'bit file')
  .option('-c, --config <file>', 'coin config JSON (name, symbol, ibmJobId, backend)')
  .option('-o, --out <prefix>', 'output prefix', 'certificate')
  .action(({ bits: file, config, out }) => {
    banner();
    const coin = config ? JSON.parse(readFileSync(config, 'utf8')) : {};
    const cert = buildCertificate({ bits: loadBits(file), meta: { name: coin.name, symbol: coin.symbol, jobId: coin.ibmJobId, backend: coin.backend, circuit: coin.circuit } });
    writeFileSync(`${out}.json`, JSON.stringify(cert, null, 2) + '\n');
    writeFileSync(`${out}.md`, certificateMarkdown(cert));
    kv('address', pc.green(cert.address));
    kv('written', `${out}.json, ${out}.md`);
    console.log();
  });

program.command('export-keypair')
  .description('export the quantum mint keypair (Solana CLI format) for use with spl-token or launchpads')
  .requiredOption('-b, --bits <file>', 'bit file')
  .option('-o, --out <file>', 'output file', 'quantum-mint.json')
  .action(({ bits: file, out }) => {
    banner();
    const kp = deriveKeypair(loadBits(file));
    writeFileSync(out, JSON.stringify([...kp.secretKey]), { mode: 0o600 });
    kv('address', pc.green(kp.address));
    kv('keypair', out);
    console.log(pc.dim(`\n  e.g.  spl-token create-token ${out}\n`));
  });

program.command('launch')
  .description('create the coin on Solana at its quantum-born address')
  .requiredOption('-c, --config <file>', 'coin config JSON (see config/coin.example.json)')
  .option('-b, --bits <file>', 'bit file (overrides config.bits)')
  .option('-k, --keypair <file>', 'payer wallet keypair', '~/.config/solana/id.json')
  .option('-n, --network <net>', 'devnet | testnet | mainnet-beta | https://your-rpc', 'devnet')
  .option('--dry-run', 'build and sign transactions without sending')
  .option('-y, --yes', 'skip mainnet confirmation')
  .action(async (o) => {
    banner();
    const { launchCoin, loadWallet } = await import('../src/mint.js');
    const coin = JSON.parse(readFileSync(o.config, 'utf8'));
    const bitsFile = o.bits ?? coin.bits;
    if (!bitsFile || !existsSync(bitsFile)) fail('Bit file not found. Pass --bits or set "bits" in the config.');
    let wallet;
    try { wallet = loadWallet(o.keypair); } catch { fail(`Cannot read wallet keypair at ${o.keypair}. Create one with: solana-keygen new`); }
    if (o.network === 'mainnet-beta' && !o.dryRun && !o.yes) {
      const readline = await import('node:readline/promises');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ans = await rl.question(pc.yellow(`  Launch ${coin.symbol} on MAINNET with real SOL? type "launch" to continue: `));
      rl.close();
      if (ans.trim() !== 'launch') fail('Aborted.');
    }
    try {
      const s = await launchCoin({ bits: loadBits(bitsFile), coin, wallet, network: o.network, dryRun: !!o.dryRun, log: (m) => console.log(pc.dim('  … ' + m)) });
      kv('network', s.network + (s.dryRun ? pc.yellow(' (dry run)') : ''));
      kv('coin', `${s.name} ($${s.symbol})`);
      kv('address', pc.green(pc.bold(s.address)));
      kv('standard', s.tokenStandard);
      kv('supply', `${Number(s.supply).toLocaleString('en-US')} (decimals ${s.decimals})`);
      kv('mint authority', s.mintAuthority);
      kv('freeze authority', s.freezeAuthority);
      kv('update authority', s.updateAuthority);
      s.signatures.forEach((sig, i) => kv(`tx ${i + 1}`, sig));
      if (!s.dryRun) console.log(pc.green(`\n  🚀 Live: https://solscan.io/token/${s.address}${s.network === 'mainnet-beta' ? '' : '?cluster=' + s.network}`));
      console.log(pc.bold('\n  Next: reveal the bits so everyone can verify →  qpc certificate -b ' + bitsFile + '\n'));
    } catch (e) { fail(e.message); }
  });

program.parseAsync();
