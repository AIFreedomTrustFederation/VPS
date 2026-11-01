#!/usr/bin/env python3
"""Check actual VPS/Runtime producer outputs against a supplied AIFT-OS checkout."""

import argparse
import json
import math
import os
import selectors
from pathlib import Path
import signal
import stat
import subprocess
import sys
import time
import tempfile

CONSUMER_TIMEOUT_SECONDS = 60
MAX_ASSESSMENT_BYTES = 1024 * 1024
MAX_CONSUMER_STDERR_BYTES = 64 * 1024


def reject_duplicate_assessment_keys(pairs):
    """Reject ambiguous consumer JSON instead of accepting the last key."""
    result = {}
    for key, value in pairs:
        if key in result:
            raise RuntimeError(f"Consumer assessment contains duplicate JSON key: {key}")
        result[key] = value
    return result


def reject_nonfinite_assessment(value):
    """Reject nonstandard JSON constants and overflowing numeric exponents."""
    raise RuntimeError(f"Consumer assessment contains non-finite number: {value}")


def finite_assessment_float(value):
    number = float(value)
    if not math.isfinite(number):
        reject_nonfinite_assessment(value)
    return number



def run_consumer_bounded(command):
    """Drain consumer pipes incrementally with bounded memory and a deadline."""
    process = subprocess.Popen(
        command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        start_new_session=True)
    stdout = bytearray()
    stderr = bytearray()
    deadline = time.monotonic() + CONSUMER_TIMEOUT_SECONDS
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ, "stdout")
            selector.register(process.stderr, selectors.EVENT_READ, "stderr")
            descendants_cleaned = False
            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise RuntimeError(
                        f"Consumer timed out after {CONSUMER_TIMEOUT_SECONDS} seconds")
                # A successful parent can exit while a descendant keeps the
                # inherited pipes open. Reap its process group promptly, then
                # drain any assessment bytes already buffered in the pipes.
                if process.poll() is not None and not descendants_cleaned:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    descendants_cleaned = True
                # Periodically inspect parent exit even if inherited pipes
                # have no activity; otherwise we wait for a false timeout.
                for key, _ in selector.select(timeout=min(remaining, 0.25)):
                    chunk = os.read(key.fileobj.fileno(), 65536)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    if key.data == "stdout":
                        if len(stdout) + len(chunk) > MAX_ASSESSMENT_BYTES:
                            raise RuntimeError("Consumer assessment exceeds 1 MiB")
                        stdout.extend(chunk)
                    elif len(stderr) < MAX_CONSUMER_STDERR_BYTES:
                        stderr.extend(chunk[:MAX_CONSUMER_STDERR_BYTES - len(stderr)])
            try:
                process.wait(timeout=max(0, deadline - time.monotonic()))
            except subprocess.TimeoutExpired as exc:
                raise RuntimeError(
                    f"Consumer timed out after {CONSUMER_TIMEOUT_SECONDS} seconds") from exc
        try:
            decoded_stdout = stdout.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise RuntimeError("Consumer assessment contains invalid UTF-8") from exc
        return subprocess.CompletedProcess(
            command, process.returncode, decoded_stdout,
            stderr.decode("utf-8", errors="replace"))
    finally:
        # Also terminate descendants of a consumer that already exited.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)
        process.stdout.close()
        process.stderr.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--consumer", type=Path, required=True)
    parser.add_argument("--vps-record", type=Path, required=True)
    parser.add_argument("--runtime-record", type=Path, required=True)
    parser.add_argument("--vps-sha", required=True)
    parser.add_argument("--runtime-sha", required=True)
    args = parser.parse_args()
    expected = {"AIFreedomTrustFederation/VPS": args.vps_sha,
                "AIFreedomTrustFederation/AIFT-Runtime": args.runtime_sha}

    def assess(values, expected_code, expected_status, failed_gate=None):
        with tempfile.TemporaryDirectory(prefix="aift-evidence-integration-") as directory:
            command = [sys.executable, "-B", str(args.consumer)]
            for repo, sha in expected.items():
                command += ["--expect", f"{repo}={sha}"]
            staged = []
            for index, value in enumerate(values):
                # Never hand original producer paths to the consumer: it must
                # not be able to rewrite evidence before the bridge inspects it.
                # Preserve raw producer bytes, including duplicate JSON keys.
                path = Path(directory) / f"{index}.json"
                raw = value if isinstance(value, bytes) else json.dumps(value).encode("utf-8")
                path.write_bytes(raw)
                staged.append((path, raw))
                command += ["--input", str(path)]
            # Stream bounded output; an untrusted consumer must not exhaust
            # verifier memory before its JSON size is checked.
            result = run_consumer_bounded(command)
            for path, raw in staged:
                # The consumer can replace a staged file with a large file or
                # symlink. Bound the post-run comparison as well as the input.
                try:
                    if path.is_symlink():
                        raise RuntimeError("Consumer modified staged evidence input")
                    with path.open("rb") as stream:
                        if stream.read(len(raw) + 1) != raw:
                            raise RuntimeError("Consumer modified staged evidence input")
                except OSError as exc:
                    raise RuntimeError("Consumer modified staged evidence input") from exc
        if result.returncode != expected_code:
            raise RuntimeError(f"Consumer exited {result.returncode}, expected {expected_code}: {result.stdout} {result.stderr}")
        # Defense in depth: capture has already enforced this limit while
        # draining the consumer, before any JSON parsing or decoding.
        if len(result.stdout.encode("utf-8")) > MAX_ASSESSMENT_BYTES:
            raise RuntimeError("Consumer assessment exceeds 1 MiB")
        try:
            report = json.loads(
                result.stdout,
                object_pairs_hook=reject_duplicate_assessment_keys,
                parse_constant=reject_nonfinite_assessment,
                parse_float=finite_assessment_float,
            )
        except (ValueError, RecursionError) as exc:
            raise RuntimeError("Consumer assessment contains invalid or excessively nested JSON") from exc
        if not isinstance(report, dict):
            raise RuntimeError("Consumer assessment must be a JSON object")
        if report.get("schema") != "aift.federation-assessment.v1":
            raise RuntimeError("Consumer assessment schema mismatch")
        # Every assessment, including rejected evidence, must retain the
        # explicit unsigned provenance boundary. A failure must not be
        # rebranded as authenticated evidence by a consumer regression.
        if report.get("provenance") != "unsigned_supplied_json_not_authenticated":
            raise RuntimeError("Consumer assessment provenance mismatch")
        if report["status"] != expected_status:
            raise RuntimeError(f"Unexpected assessment: {report}")
        # A negative gate must be attributed to the correct producer and gate.
        # A generic failed status alone would hide which boundary failed.
        if failed_gate is not None:
            failed_repo, gate = failed_gate
            entries = report.get("repositories")
            if (not isinstance(entries, list) or len(entries) != len(expected)
                    or any(not isinstance(item, dict) for item in entries)
                    or any(not isinstance(item.get("repository"), str) for item in entries)):
                raise RuntimeError("Consumer negative gate attribution mismatch")
            by_repo = {item["repository"]: item for item in entries}
            if (len(by_repo) != len(entries) or set(by_repo) != set(expected)
                    or report.get("errors", []) != []
                    or any(item.get("commit_sha") != expected[repo]
                           or item.get("failed_gates") != ([gate] if repo == failed_repo else [])
                           or item.get("status") != ("failed" if repo == failed_repo
                                                     else "reported_checks_passed_with_gaps")
                           for repo, item in by_repo.items())):
                raise RuntimeError("Consumer negative gate attribution mismatch")
        return report

    # Snapshot each producer record exactly once, before invoking a consumer.
    # Both the consumer and subsequent bridge assertions use these same bytes.
    sources = (args.vps_record, args.runtime_record)
    original_inputs = []
    original_identities = []
    for source in sources:
        # A byte-for-byte replacement at the same pathname is still a
        # different producer artifact. Record the filesystem identity before
        # invoking a consumer, and do not accept symlinked producer paths.
        identity = source.lstat()
        if not stat.S_ISREG(identity.st_mode):
            raise RuntimeError("Producer evidence must be a regular file")
        with source.open("rb") as stream:
            raw = stream.read(MAX_ASSESSMENT_BYTES + 1)
        if len(raw) > MAX_ASSESSMENT_BYTES:
            raise RuntimeError("Producer evidence exceeds 1 MiB")
        original_inputs.append(raw)
        original_identities.append((identity.st_dev, identity.st_ino))
    report = assess(original_inputs, 0, "partial")
    records = [json.loads(raw) for raw in original_inputs]
    if report["provenance"] != "unsigned_supplied_json_not_authenticated":
        raise RuntimeError("Consumer must preserve unsigned provenance")
    # A partial assessment must account for both exact producer identities and
    # checkout SHAs. Otherwise a consumer regression could silently drop a
    # repository and make this integration test appear green.
    entries = report.get("repositories")
    if (not isinstance(entries, list) or len(entries) != len(expected)
            or any(not isinstance(item, dict) for item in entries)
            or {item.get("repository"): item.get("commit_sha") for item in entries} != expected
            or report.get("errors", []) != []):
        raise RuntimeError("Consumer positive report omitted or mismatched expected repository evidence")
    # A consumer must account for every executed check, not merely claim that
    # the repository passed. A dropped check would otherwise be invisible.
    check_counts = {record["repository"]: len(record["checks"]) for record in records}
    # A consumer must preserve *every* unchecked gate. Keeping just one gap
    # would still yield "partial" while hiding other unverified boundaries.
    expected_gaps = {
        record["repository"]: [
            f"{gate}:{record[gate]['status']}"
            for gate in ("security", "dependencies", "deployment")
            if record[gate]["status"] in ("not_checked", "not_applicable")
        ]
        for record in records
    }
    for item in entries:
        if (item["status"] != "reported_checks_passed_with_gaps"
                or not expected_gaps[item["repository"]]
                or item.get("unverified_gates") != expected_gaps[item["repository"]]
                or item.get("failed_gates") != []
                or type(item.get("check_count")) is not int
                or item["check_count"] != check_counts[item["repository"]]):
            raise RuntimeError("Consumer must preserve executed check counts and unchecked gates")
    assess(records[:1], 1, "failed")
    stale = json.loads(json.dumps(records))
    stale[0]["commit_sha"] = "0" * 40 if args.vps_sha != "0" * 40 else "1" * 40
    assess(stale, 1, "failed")
    failed = json.loads(json.dumps(records))
    failed[0]["checks"][0].update(status="failed", exit_code=7)
    failed[0]["overall_status"] = "failed"
    assess(failed, 1, "failed")
    # Exercise Runtime independently: a consumer must not silently trust the
    # second producer while correctly rejecting only VPS corruption.
    stale_runtime = json.loads(json.dumps(records))
    stale_runtime[1]["commit_sha"] = "0" * 40 if args.runtime_sha != "0" * 40 else "1" * 40
    assess(stale_runtime, 1, "failed")
    failed_runtime = json.loads(json.dumps(records))
    failed_runtime[1]["checks"][0].update(status="failed", exit_code=7)
    failed_runtime[1]["overall_status"] = "failed"
    assess(failed_runtime, 1, "failed")
    # A successful source-check exit code must never mask a failed security
    # gate from either producer. This protects the cross-repository handoff
    # against a consumer regression that ignores negative gate evidence.
    for index in range(len(records)):
        failed_security = json.loads(json.dumps(records))
        failed_security[index]["security"] = {
            "status": "failed", "reason": "Synthetic negative security evidence."
        }
        assess(failed_security, 1, "failed", (records[index]["repository"], "security"))
    # A failed dependency or deployment gate must fail the assessment even
    # when source checks and the security gate pass.
    for gate in ("dependencies", "deployment"):
        for index in range(len(records)):
            failed_gate = json.loads(json.dumps(records))
            failed_gate[index][gate] = {
                "status": "failed", "reason": f"Synthetic negative {gate} evidence."
            }
            assess(failed_gate, 1, "failed", (records[index]["repository"], gate))
    # An external writer must not swap the producer files after snapshotting
    # but before the workflow uploads those original evidence paths.
    for source, original, identity in zip(sources, original_inputs, original_identities):
        # Replacing the original with identical bytes must not pass: the
        # uploaded artifact would no longer be the one initially inspected.
        try:
            current = source.lstat()
            if (not stat.S_ISREG(current.st_mode)
                    or (current.st_dev, current.st_ino) != identity):
                raise RuntimeError("Producer evidence changed during verification")
            with source.open("rb") as stream:
                if stream.read(MAX_ASSESSMENT_BYTES + 1) != original:
                    raise RuntimeError("Producer evidence changed during verification")
        except OSError as exc:
            raise RuntimeError("Producer evidence changed during verification") from exc
    print("Federation evidence integration: VPS and Runtime passed; missing, stale, failed checks and all negative gates checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
