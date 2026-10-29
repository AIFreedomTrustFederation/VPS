#!/usr/bin/env python3
"""Run VPS source checks and emit unsigned AIFT v1 verification evidence."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "AIFreedomTrustFederation/VPS"
CHECKS = (
    ("source", ["npm", "run", "qa:local"]),
    ("node_refresh", [sys.executable, "-B", "tests/test-git-refresh.py"]),
    ("bluegreen", [sys.executable, "-B", "tests/test-bluegreen-sync.py"]),
    ("heartbeat", [sys.executable, "-B", "tests/test-heartbeat.py"]),
    ("evidence_regression", [sys.executable, "-B", "tests/test-source-verification.py"]),
)
CHECK_TIMEOUT = 300


def git(root: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=root, capture_output=True,
                            text=True, check=True, timeout=30)
    return result.stdout.strip()


def commit(root: Path) -> str:
    sha = git(root, "rev-parse", "HEAD")
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("checkout commit must be a full lowercase Git SHA")
    return sha


def checkout_clean(root: Path, expected_sha: str) -> bool:
    try:
        return (not git(root, "status", "--porcelain", "--untracked-files=normal")
                and commit(root) == expected_sha)
    except (OSError, ValueError, subprocess.SubprocessError):
        return False


def run_check(check_id: str, command: list[str], root: Path) -> dict:
    try:
        code = subprocess.run(command, cwd=root, check=False, timeout=CHECK_TIMEOUT).returncode
    except subprocess.TimeoutExpired:
        print(f"{check_id}: timed out", file=sys.stderr)
        code = 124
    except OSError as error:
        print(f"{check_id}: could not execute: {error}", file=sys.stderr)
        code = 127
    return {"id": check_id, "command": shlex.join(command),
            "status": "passed" if code == 0 else "failed", "exit_code": code}


def generate(root: Path, output: Path, environ: dict | None = None) -> int:
    env = os.environ if environ is None else environ
    try:
        root, output = root.resolve(), output.resolve()
        if output.is_relative_to(root):
            raise ValueError("verification output must be outside the checkout")
        if Path(git(root, "rev-parse", "--show-toplevel")).resolve() != root:
            raise ValueError("verification root must be the Git checkout root")
        sha = commit(root)
        if env.get("GITHUB_SHA") and env["GITHUB_SHA"] != sha:
            raise ValueError("GITHUB_SHA does not match checkout commit")
        if env.get("GITHUB_REPOSITORY") and env["GITHUB_REPOSITORY"] != REPOSITORY:
            raise ValueError("GITHUB_REPOSITORY does not match VPS")

        before = checkout_clean(root, sha)
        checks = [run_check(check_id, command, root) for check_id, command in CHECKS]
        clean = checkout_clean(root, sha) and before
        checks.append({"id": "worktree", "command": "git status and HEAD (before and after)",
                       "status": "passed" if clean else "failed", "exit_code": 0 if clean else 1})
        source = "github-actions" if env.get("GITHUB_ACTIONS") == "true" else "local"
        run_id = env.get("GITHUB_RUN_ID", "")
        run_url = (f"https://github.com/{REPOSITORY}/actions/runs/{run_id}"
                   if source == "github-actions" and re.fullmatch(r"[1-9][0-9]*", run_id) else None)
        passed = all(check["status"] == "passed" for check in checks)
        record = {
            "schema": "aift.verification.v1", "repository": REPOSITORY,
            "commit_sha": sha, "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "source": {"type": source, "run_url": run_url}, "checks": checks,
            "overall_status": "passed" if passed else "failed",
            "security": {"status": "not_checked", "reason": "Source checks are not a security assessment."},
            "dependencies": {"status": "not_checked", "reason": "No application or cross-repository runtime is exercised."},
            "deployment": {"status": "not_applicable", "reason": "This gate does not deploy services."},
            "limitations": [
                "Source and isolated regression checks do not prove dashboard, node-agent, desktop or Android builds.",
                "No live node health, routing, model inference or production deployment is verified.",
                "The record is unsigned supplied JSON, not authenticated provenance.",
                "Worktree checks exclude ignored files and external runtime state.",
            ],
        }
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"VPS verification evidence: {output} ({record['overall_status']})")
        return 0 if passed else 1
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"VPS verification failed: {error}", file=sys.stderr)
        return 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    return generate(ROOT, args.output)


if __name__ == "__main__":
    sys.exit(main())
