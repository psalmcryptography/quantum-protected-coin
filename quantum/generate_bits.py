#!/usr/bin/env python3
"""
Quantum Protected Coin — harvest raw measurement bits from a real IBM quantum computer.

Default: 64 qubits x 128 shots = 8,192 bits (same shape as $QUANTUM, IBM job db470m84qg6s73c1o67g).

Circuit: every qubit gets a Hadamard gate (|0> -> equal superposition of |0> and |1>)
and is then measured. Each measurement collapses to 0 or 1 with probability 1/2 —
randomness that comes from quantum mechanics itself, not from a software PRNG.

Usage
-----
    pip install -r quantum/requirements.txt
    export QISKIT_IBM_TOKEN=<your IBM Quantum API key>       # https://quantum.cloud.ibm.com
    python quantum/generate_bits.py                          # least-busy real backend
    python quantum/generate_bits.py --backend ibm_marrakesh  # specific backend
    python quantum/generate_bits.py --simulate               # local test run (NOT quantum, never launch with it)

Outputs (in --out, default quantum/out/):
    bits.txt   the 8,192-bit string — KEEP SECRET until your coin is live
    job.json   job id, backend, timestamps, circuit description, per-shot strings
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

SEED_TAG = "quantum-mint-seed-v1:"


def build_circuit(qubits: int):
    from qiskit import QuantumCircuit

    qc = QuantumCircuit(qubits, qubits, name="qpc_entropy")
    qc.h(range(qubits))
    qc.measure(range(qubits), range(qubits))
    return qc


def run_ibm(qubits: int, shots: int, backend_name: str | None, instance: str | None):
    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

    token = os.environ.get("QISKIT_IBM_TOKEN")
    kwargs = {"channel": "ibm_quantum_platform"}
    if token:
        kwargs["token"] = token
    if instance:
        kwargs["instance"] = instance
    service = QiskitRuntimeService(**kwargs)

    if backend_name:
        backend = service.backend(backend_name)
    else:
        backend = service.least_busy(operational=True, simulator=False, min_num_qubits=qubits)
    print(f"[qpc] backend: {backend.name} ({backend.num_qubits} qubits)")

    isa = generate_preset_pass_manager(optimization_level=1, backend=backend).run(build_circuit(qubits))
    job = SamplerV2(mode=backend).run([isa], shots=shots)
    print(f"[qpc] submitted job {job.job_id()} — waiting in queue (this can take minutes)…")
    result = job.result()
    shots_list = result[0].data[isa.cregs[0].name].get_bitstrings()
    return shots_list, {"provider": "IBM Quantum", "backend": backend.name, "jobId": job.job_id(), "simulated": False}


def run_simulator(qubits: int, shots: int):
    from qiskit.primitives import StatevectorSampler

    # Statevector simulation of 64 qubits is impossible, so simulate in 16-qubit blocks.
    block = 16
    per_block = []
    for _ in range(qubits // block):
        qc = build_circuit(block)
        res = StatevectorSampler().run([qc], shots=shots).result()
        per_block.append(res[0].data[qc.cregs[0].name].get_bitstrings())
    shots_list = ["".join(b[i] for b in per_block) for i in range(shots)]
    return shots_list, {"provider": "local simulator", "backend": "StatevectorSampler", "jobId": None, "simulated": True}


def main() -> int:
    p = argparse.ArgumentParser(description="Harvest quantum bits for a Quantum Protected Coin")
    p.add_argument("--qubits", type=int, default=64)
    p.add_argument("--shots", type=int, default=128)
    p.add_argument("--backend", help="IBM backend name, e.g. ibm_marrakesh, ibm_torino")
    p.add_argument("--instance", help="IBM Cloud instance CRN (optional)")
    p.add_argument("--simulate", action="store_true", help="local simulator — for testing only")
    p.add_argument("--out", default="quantum/out")
    a = p.parse_args()

    if a.qubits % 16 and a.simulate:
        p.error("--simulate needs --qubits to be a multiple of 16")

    shots_list, meta = run_simulator(a.qubits, a.shots) if a.simulate else run_ibm(a.qubits, a.shots, a.backend, a.instance)
    bits = "".join(shots_list)
    assert len(bits) == a.qubits * a.shots, "unexpected bit count"

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "bits.txt").write_text(bits + "\n")
    fingerprint = hashlib.sha256(bits.encode()).hexdigest()
    (out / "job.json").write_text(json.dumps({
        "standard": "QPC-1",
        **meta,
        "qubits": a.qubits,
        "shots": a.shots,
        "bits": len(bits),
        "circuit": f"H on each of {a.qubits} qubits, then measure",
        "fingerprint": fingerprint,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "shotStrings": shots_list,
    }, indent=2) + "\n")

    print(f"[qpc] {len(bits)} bits written to {out / 'bits.txt'}")
    print(f"[qpc] fingerprint (publish this BEFORE launch): {fingerprint}")
    if meta["simulated"]:
        print("[qpc] WARNING: simulated bits are NOT quantum. Use them only on devnet.", file=sys.stderr)
    print("[qpc] keep bits.txt private until the coin is live!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
