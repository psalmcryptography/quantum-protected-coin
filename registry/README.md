# 📜 QPC Registry

Every coin here is re-verified by CI on each push: `SHA-256(bits) == fingerprint` and `derive(bits) == address`.

| | Coin | Address | Backend | Bits |
|:-:|---|---|---|--:|
| ✅ | $QUANTUM | `AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ` | ibm_marrakesh | 8192 |

## Add your coin

1. Launch with `qpc launch` and reveal your bits.
2. Create `registry/<SYMBOL>/` with:
   - `bits.txt` — the revealed bits
   - `coin.json` — `name`, `symbol`, `address`, `fingerprint`, `provider`, `backend`, `ibmJobId`, `qubits`, `shots`, `launchedAt`, links
3. Run `node scripts/verify-registry.js` locally, then open a PR.

Listing here means **only** that the quantum derivation checks out. It is not an endorsement of any token.
