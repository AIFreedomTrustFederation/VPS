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
    records = [json.loads(path.read_text()) for path in (args.vps_record, args.runtime_record)]
    expected = {"AIFreedomTrustFederation/VPS": args.vps_sha,
                "AIFreedomTrustFederation/AIFT-Runtime": args.runtime_sha}

    def assess(values, expected_code, expected_status):
        with tempfile.TemporaryDirectory(prefix="aift-evidence-integration-") as directory:
            command = [sys.executable, "-B", str(args.consumer)]
            for repo, sha in expected.items():
                command += ["--expect", f"{repo}={sha}"]
            for index, value in enumerate(values):
                path = Path(directory) / f"{index}.json"
                path.write_text(json.dumps(value))
                command += ["--input", str(path)]
            result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode != expected_code:
            raise RuntimeError(f"Consumer exited {result.returncode}, expected {expected_code}: {result.stdout} {result.stderr}")
        report = json.loads(result.stdout)
        if report["status"] != expected_status:
            raise RuntimeError(f"Unexpected assessment: {report}")
        return report

    report = assess(records, 0, "partial")
    if report["provenance"] != "unsigned_supplied_json_not_authenticated":
        raise RuntimeError("Consumer must preserve unsigned provenance")
    for item in report["repositories"]:
        if item["status"] != "reported_checks_passed_with_gaps" or not item["unverified_gates"]:
            raise RuntimeError("Consumer must preserve unchecked gates")
    assess(records[:1], 1, "failed")
    stale = json.loads(json.dumps(records))
    stale[0]["commit_sha"] = "0" * 40 if args.vps_sha != "0" * 40 else "1" * 40
    assess(stale, 1, "failed")
    failed = json.loads(json.dumps(records))
    failed[0]["checks"][0].update(status="failed", exit_code=7)
    failed[0]["overall_status"] = "failed"
    assess(failed, 1, "failed")
    print("Federation evidence integration: passed, missing, stale and failed records checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
