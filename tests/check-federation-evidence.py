#!/usr/bin/env python3
"""Check actual VPS/Runtime producer outputs against a supplied AIFT-OS checkout."""

import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile


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

    def assess(values, expected_code, expected_status):
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
            result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode != expected_code:
            raise RuntimeError(f"Consumer exited {result.returncode}, expected {expected_code}: {result.stdout} {result.stderr}")
        report = json.loads(result.stdout)
        if report.get("schema") != "aift.federation-assessment.v1":
            raise RuntimeError("Consumer assessment schema mismatch")
        # Every assessment, including rejected evidence, must retain the
        # explicit unsigned provenance boundary. A failure must not be
        # rebranded as authenticated evidence by a consumer regression.
        if report.get("provenance") != "unsigned_supplied_json_not_authenticated":
            raise RuntimeError("Consumer assessment provenance mismatch")
        if report["status"] != expected_status:
            raise RuntimeError(f"Unexpected assessment: {report}")
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
        assess(failed_security, 1, "failed")
    # A failed dependency or deployment gate must fail the assessment even
    # when source checks and the security gate pass.
    for gate in ("dependencies", "deployment"):
        for index in range(len(records)):
            failed_gate = json.loads(json.dumps(records))
            failed_gate[index][gate] = {
                "status": "failed", "reason": f"Synthetic negative {gate} evidence."
            }
            assess(failed_gate, 1, "failed")
    print("Federation evidence integration: VPS and Runtime passed; missing, stale, failed checks and all negative gates checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
