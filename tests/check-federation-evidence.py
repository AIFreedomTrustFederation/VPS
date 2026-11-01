#!/usr/bin/env python3
"""Check actual VPS/Runtime producer outputs against a supplied AIFT-OS checkout."""

import argparse
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile

CONSUMER_TIMEOUT_SECONDS = 60
MAX_ASSESSMENT_BYTES = 1024 * 1024


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
            for index, value in enumerate(values):
                if isinstance(value, Path):
                    # The positive integration check must consume original
                    # producer bytes. JSON re-encoding can erase duplicate keys.
                    path = value
                else:
                    path = Path(directory) / f"{index}.json"
                    path.write_text(json.dumps(value))
                command += ["--input", str(path)]
            # A timed-out consumer may have spawned descendants that inherited
            # stdout/stderr. Kill its entire process group, not just its leader.
            # This integration runner executes on Linux in GitHub Actions.
            process = subprocess.Popen(
                command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, start_new_session=True)
            timed_out = False
            try:
                stdout, stderr = process.communicate(timeout=CONSUMER_TIMEOUT_SECONDS)
            except subprocess.TimeoutExpired as exc:
                timed_out = True
                raise RuntimeError(
                    f"Consumer timed out after {CONSUMER_TIMEOUT_SECONDS} seconds"
                ) from exc
            finally:
                # A consumer may exit successfully but leave background
                # descendants with closed stdout/stderr. Always terminate
                # its process group before inspecting or publishing evidence.
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass  # No processes remain in the consumer's group.
                if timed_out or process.poll() is None:
                    process.communicate(timeout=5)
            result = subprocess.CompletedProcess(command, process.returncode, stdout, stderr)
        if result.returncode != expected_code:
            raise RuntimeError(f"Consumer exited {result.returncode}, expected {expected_code}: {result.stdout} {result.stderr}")
        # Bound accepted assessment bytes before parsing. communicate() still
        # buffers stdout, so this is a parsing/contract limit rather than a
        # process-memory limit; the process timeout remains independent.
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

    # Validate the original evidence files before creating mutated negative fixtures.
    report = assess([args.vps_record, args.runtime_record], 0, "partial")
    records = [json.loads(path.read_text()) for path in (args.vps_record, args.runtime_record)]
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
    print("Federation evidence integration: VPS and Runtime passed; missing, stale, failed checks and all negative gates checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
