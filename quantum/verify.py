#!/usr/bin/env python3
"""
Independent Python verifier for Quantum Protected Coins (no Node.js needed).

    pip install pynacl base58
    python quantum/verify.py examples/quantum/bits.txt \
        --fingerprint 15f22c99b64e31521c288bbb0e98ad486e71b049c6e5916c93b7270fb34711fa \
        --address AUd3rULBqpeUMUcoguBc8afg68g2hjj7SegB9AJsKCyQ
"""
import argparse
import hashlib
import re
import sys

import base58
from nacl.signing import SigningKey

SEED_TAG = "quantum-mint-seed-v1:"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("bits_file")
    p.add_argument("--fingerprint")
    p.add_argument("--address")
    a = p.parse_args()

    bits = re.sub(r"[\s,]", "", open(a.bits_file).read())
    if not re.fullmatch(r"[01]+", bits):
        sys.exit("bit file must contain only 0 and 1")

    fp = hashlib.sha256(bits.encode()).hexdigest()
    seed = hashlib.sha256((SEED_TAG + bits).encode()).digest()
    address = base58.b58encode(bytes(SigningKey(seed).verify_key)).decode()

    print(f"bits         {len(bits)}")
    print(f"fingerprint  {fp}")
    print(f"address      {address}")
    ok = True
    if a.fingerprint:
        good = fp == a.fingerprint.lower()
        ok &= good
        print(("✔" if good else "✖") + " fingerprint matches commitment")
    if a.address:
        good = address == a.address
        ok &= good
        print(("✔" if good else "✖") + " address matches contract")
    print("VERIFIED" if ok else "NOT VERIFIED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
