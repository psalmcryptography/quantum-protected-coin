# ❓ FAQ

### General

**What’s the difference between $QUANTUM and this repo?**
$QUANTUM is the genesis coin. This repo is the open toolkit that reproduces its method so anyone can create — and verify — Quantum Protected Coins.

**Does the coin keep using the quantum computer after launch?**
No. The quantum computer is used once, at birth, to produce the randomness that determines the address.

**Why 64 qubits × 128 shots?**
8,192 bits is far more entropy than the 256 bits a seed needs, so hardware bias or noise can’t weaken it, and it’s small enough to post publicly.

### Verification

**What if someone posts different bits and claims they’re the real ones?**
They won’t hash to the pre-launch fingerprint, and won’t derive the contract address. Only one bit string in the universe does both.

**Can I verify on my phone?**
Any SHA-256 + ed25519 tool works. A browser verifier is on the roadmap.

**How do I know the fingerprint was really posted before launch?**
Compare the timestamp of the commitment post with the block time of the mint’s first transaction on Solscan.

### Launching

**Can I use pump.fun or another launchpad?**
Only if it lets you supply your own mint keypair. Export it with `qpc export-keypair`. Otherwise use `qpc launch` and add liquidity on a DEX yourself.

**Token-2022 or classic SPL?**
Token-2022 (default) stores name, symbol and the quantum fingerprint on-chain and is supported by major wallets. Choose `"program": "spl"` if a venue you need doesn’t support Token-2022 — then add Metaplex metadata separately.

**Can I launch two coins from the same bits?**
No — one set of bits gives one address. Generate new bits for each coin.

**Is there a fee to use this repo?**
No. MIT-licensed, no fees, no hidden transfers. Read `src/mint.js` — it’s ~120 lines.
