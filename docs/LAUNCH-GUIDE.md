# 🪙 Launch guide — your first Quantum Protected Coin

Time needed: ~20 minutes (most of it waiting in the IBM queue). Cost: ≈ 0.007 SOL + whatever liquidity you add.

## Checklist

| ✔ | Requirement | Get it |
|:-:|---|---|
| ☐ | Node.js 18+ | https://nodejs.org |
| ☐ | Python 3.10+ | https://python.org |
| ☐ | IBM Quantum account + API key | https://quantum.cloud.ibm.com |
| ☐ | Solana CLI (for wallet) | https://docs.solana.com/cli/install |
| ☐ | A funded Solana wallet | `solana-keygen new` |
| ☐ | Logo + metadata JSON hosted somewhere (IPFS, Arweave, GitHub) | see [metadata template](#metadata-json) |

## 1 · Install

```bash
git clone https://github.com/florianvates/quantum-protected-coin.git
cd quantum-protected-coin
npm install
pip install -r quantum/requirements.txt
```

## 2 · Harvest quantum bits

```bash
export QISKIT_IBM_TOKEN="your-ibm-api-key"
python quantum/generate_bits.py                         # picks the least-busy real QPU
# or: python quantum/generate_bits.py --backend ibm_marrakesh
```

Output:

```
[qpc] backend: ibm_marrakesh (156 qubits)
[qpc] submitted job d3xxxxxxxxxxxxxxxxxx — waiting in queue…
[qpc] 8192 bits written to quantum/out/bits.txt
[qpc] fingerprint (publish this BEFORE launch): 9a1f…
```

> `quantum/out/` is in `.gitignore`. Keep it that way until you launch.

Want to rehearse without IBM? `python quantum/generate_bits.py --simulate` makes **non-quantum** test bits. Never launch on mainnet with them.

## 3 · Health check

```bash
npx qpc analyze -b quantum/out/bits.txt
```

All five checks should be ✔. One or two biased qubits are normal on real hardware.

## 4 · Commit publicly

```bash
npx qpc commit -b quantum/out/bits.txt --job <job-id> --backend <backend>
```

Post the printed text on X / Telegram / GitHub. **Do not** post the bits or the address.

## 5 · Configure

```bash
cp config/coin.example.json my-coin.json
```

Set `name`, `symbol`, `uri`, `supply`, `bits`, `expectedFingerprint`, `ibmJobId`, `backend`.

## 6 · Rehearse on devnet

```bash
solana airdrop 2 --url devnet
npx qpc launch -c my-coin.json -n devnet
```

Open the printed Solscan link and check name, supply and authorities.

## 7 · Launch on mainnet

```bash
npx qpc launch -c my-coin.json -n mainnet-beta
# or with your own RPC:
npx qpc launch -c my-coin.json -n https://your-rpc.example.com
```

You'll be asked to type `launch` to confirm.

## 8 · Reveal and certify

```bash
npx qpc certificate -b quantum/out/bits.txt -c my-coin.json -o certificate
node scripts/render-art.js quantum/out/bits.txt art '$MYCOIN'
```

Publish `bits.txt`, `certificate.md` and the art. Holders verify with:

```bash
npx qpc verify -b bits.txt -f <fingerprint> -a <address>
```

## 9 · (Optional) add your coin to the registry

Open a PR adding a folder under `registry/<SYMBOL>/` with `bits.txt`, `coin.json` and `certificate.md`. CI will verify it automatically.

---

### Metadata JSON

Host this file and put its URL in `uri`:

```json
{
  "name": "My Quantum Coin",
  "symbol": "MQC",
  "description": "A Quantum Protected Coin — address born on IBM Quantum. Verify: github.com/…",
  "image": "https://…/logo.png",
  "external_url": "https://…",
  "extensions": { "twitter": "https://x.com/…", "telegram": "https://t.me/…" }
}
```

### Troubleshooting

| Error | Fix |
|---|---|
| `Bits do not match the committed fingerprint` | You edited / regenerated `bits.txt`. Use the file you committed. |
| `Account … already exists` | Those bits were already used (or leaked). Generate new bits and re-commit. |
| `Wallet balance … too low` | Fund the payer wallet. |
| `Cannot read wallet keypair` | Pass `-k path/to/id.json` or run `solana-keygen new`. |
| IBM job stuck in queue | Try `--backend` with a less busy QPU, or wait. |
