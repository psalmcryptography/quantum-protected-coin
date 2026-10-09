# 🤝 Contributing

Thanks for helping make quantum coins real!

## Ground rules

1. **Never break QPC-1.** `npm run verify:quantum` must keep verifying `$QUANTUM`. New derivation schemes get a new tag (`quantum-mint-seed-v2:`), never a silent change.
2. **No secrets in git.** No private keys, no unrevealed bits.
3. **Keep it auditable.** The launch path (`src/mint.js`) must stay small and readable. No hidden transfers or fees.

## Dev setup

```bash
npm install
npm test
npm run demo
```

## Good first contributions

| Area | Idea |
|---|---|
| 🌐 Web | single-file browser verifier (`web/verify.html`) |
| ⚛️ Providers | IonQ / Quantinuum / AWS Braket bit harvesters |
| 📜 Registry | add your verified coin |
| 🌍 Docs | translations (RU, ES, ZH, …) |
| 🧪 Tests | more randomness tests (NIST block frequency, serial) |

## Commit style

`feat:`, `fix:`, `docs:`, `test:`, `chore:` prefixes, please.
