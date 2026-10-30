#!/usr/bin/env python3
"""Exercise evidence generation using real temporary Git repos and commands."""

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/run_source_verification.py"
spec = importlib.util.spec_from_file_location("vps_evidence", SCRIPT)
evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence)


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "checkout"
        self.root.mkdir()
        self.output = self.base / "evidence.json"
        self.git("init", "-q")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        (self.root / "README.md").write_text("fixture\n")
        self.git("add", ".")
        self.git("commit", "-qm", "Fixture")
        self.sha = self.git("rev-parse", "HEAD").strip()

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, check=True,
                              capture_output=True, text=True).stdout

    def generate(self, programs=("pass",), env=None):
        checks = tuple((f"fixture_{index}", [sys.executable, "-B", "-c", program])
                       for index, program in enumerate(programs))
        with patch.object(evidence, "CHECKS", checks):
            code = evidence.generate(self.root, self.output, {} if env is None else env)
        return code, json.loads(self.output.read_text()) if self.output.exists() else None

    def test_passed_record_has_identity_time_and_explicit_gaps(self):
        code, record = self.generate()
        self.assertEqual(code, 0)
        self.assertEqual(record["schema"], "aift.verification.v1")
        self.assertEqual(record["repository"], "AIFreedomTrustFederation/VPS")
        self.assertEqual(record["commit_sha"], self.sha)
        self.assertIsNotNone(evidence.dt.datetime.fromisoformat(record["generated_at"]).utcoffset())
        self.assertEqual(record["overall_status"], "passed")
        self.assertEqual(record["security"]["status"], "not_checked")
        self.assertEqual(record["dependencies"]["status"], "not_checked")
        self.assertEqual(record["deployment"]["status"], "not_applicable")
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_failed_command_preserves_exit_code_and_continues(self):
        code, record = self.generate(("raise SystemExit(7)", "pass"))
        self.assertEqual(code, 1)
        self.assertEqual(record["overall_status"], "failed")
        self.assertEqual([c["exit_code"] for c in record["checks"]], [7, 0, 0])

    def test_missing_executable_fails(self):
        with patch.object(evidence, "CHECKS", (("missing", ["/no/such/aift-executable"]),)):
            self.assertEqual(evidence.generate(self.root, self.output, {}), 1)
        self.assertEqual(json.loads(self.output.read_text())["checks"][0]["exit_code"], 127)

    def test_timeout_fails(self):
        with patch.object(evidence, "CHECK_TIMEOUT", 0.01):
            code, record = self.generate(("import time; time.sleep(1)",))
        self.assertEqual(code, 1)
        self.assertEqual(record["checks"][0]["exit_code"], 124)

    def test_initial_dirty_checkout_fails_even_if_command_cleans_it(self):
        (self.root / "untracked").write_text("dirty")
        code, record = self.generate(("from pathlib import Path; Path('untracked').unlink()",))
        self.assertEqual(code, 1)
        self.assertEqual(record["checks"][-1]["status"], "failed")

    def test_generated_untracked_file_fails(self):
        code, record = self.generate(("from pathlib import Path; Path('generated').write_text('dirty')",))
        self.assertEqual(code, 1)
        self.assertEqual(record["checks"][-1]["status"], "failed")

    def test_head_change_fails_even_with_clean_worktree(self):
        code, record = self.generate(("import subprocess; subprocess.run(['git','commit','--allow-empty','-qm','changed'],check=True)",))
        self.assertEqual(code, 1)
        self.assertEqual(record["commit_sha"], self.sha)
        self.assertEqual(record["checks"][-1]["status"], "failed")

    def test_wrong_ci_identity_rejected_before_running_checks(self):
        for env in ({"GITHUB_SHA": "a" * 40}, {"GITHUB_REPOSITORY": "other/repo"}):
            with self.subTest(env=env):
                code, record = self.generate(env=env)
                self.assertEqual(code, 2)
                self.assertIsNone(record)

    def test_ci_run_url_is_scoped_to_vps(self):
        code, record = self.generate(env={"GITHUB_SHA": self.sha,
            "GITHUB_REPOSITORY": evidence.REPOSITORY, "GITHUB_ACTIONS": "true", "GITHUB_RUN_ID": "123"})
        self.assertEqual(code, 0)
        self.assertEqual(record["source"]["run_url"], "https://github.com/AIFreedomTrustFederation/VPS/actions/runs/123")

    def test_ci_source_rejects_missing_or_invalid_identity_before_checks(self):
        base = {"GITHUB_ACTIONS": "true", "GITHUB_SHA": self.sha,
                "GITHUB_REPOSITORY": evidence.REPOSITORY, "GITHUB_RUN_ID": "123"}
        for missing in ("GITHUB_SHA", "GITHUB_REPOSITORY", "GITHUB_RUN_ID"):
            with self.subTest(missing=missing):
                env = dict(base)
                del env[missing]
                code, record = self.generate(env=env)
                self.assertEqual(code, 2)
                self.assertIsNone(record)
        for invalid in ("0", "not-a-run-id", "-1"):
            with self.subTest(invalid=invalid):
                code, record = self.generate(env=dict(base, GITHUB_RUN_ID=invalid))
                self.assertEqual(code, 2)
                self.assertIsNone(record)

    def test_local_source_does_not_require_ci_identity(self):
        code, record = self.generate(env={})
        self.assertEqual(code, 0)
        self.assertEqual(record["source"], {"type": "local", "run_url": None})

    def test_atomic_publication_preserves_prior_record_on_rename_failure(self):
        # An error after staging must never truncate or replace old evidence.
        prior = '{"previous":"complete"}\n'
        self.output.write_text(prior, encoding="utf-8")
        with patch.object(evidence.os, "replace",
                          side_effect=OSError("simulated rename failure")) as replace:
            code, _ = self.generate()
        self.assertEqual(code, 2)
        replace.assert_called_once()
        self.assertEqual(self.output.read_text(encoding="utf-8"), prior)
        self.assertEqual(list(self.base.glob(".evidence.json.*.tmp")), [])

    def test_atomic_publication_cleans_staged_file_on_fsync_failure(self):
        prior = '{"previous":"complete"}\n'
        self.output.write_text(prior, encoding="utf-8")
        with patch.object(evidence.os, "fsync",
                          side_effect=OSError("simulated fsync failure")) as fsync:
            code, _ = self.generate()
        self.assertEqual(code, 2)
        fsync.assert_called_once()
        self.assertEqual(self.output.read_text(encoding="utf-8"), prior)
        self.assertEqual(list(self.base.glob(".evidence.json.*.tmp")), [])

    def test_atomic_publication_replaces_complete_prior_record(self):
        self.output.write_text('{"previous":"complete"}\n',
                               encoding="utf-8")
        code, record = self.generate()
        self.assertEqual(code, 0)
        self.assertEqual(record["commit_sha"], self.sha)
        self.assertNotIn("previous", record)
        self.assertEqual(list(self.base.glob(".evidence.json.*.tmp")), [])

    def test_output_inside_checkout_rejected(self):
        self.assertEqual(evidence.generate(self.root, self.root / "evidence.json", {}), 2)
        self.assertFalse((self.root / "evidence.json").exists())

    def test_output_symlink_into_checkout_rejected(self):
        alias = self.base / "alias"
        alias.symlink_to(self.root, target_is_directory=True)
        self.assertEqual(evidence.generate(self.root, alias / "evidence.json", {}), 2)

    def test_non_git_root_rejected(self):
        plain = self.base / "not-a-checkout"
        plain.mkdir()
        self.assertEqual(evidence.generate(plain, self.output, {}), 2)
        self.assertFalse(self.output.exists())

    def test_subdirectory_is_not_checkout_root(self):
        child = self.root / "child"
        child.mkdir()
        self.assertEqual(evidence.generate(child, self.output, {}), 2)



# The integration bridge must pass original producer bytes to the strict
# consumer. Re-encoding JSON can silently erase duplicate keys.
STRICT_BRIDGE_CONSUMER = r'''
import argparse, json, sys
p = argparse.ArgumentParser()
p.add_argument('--expect', action='append', required=True)
p.add_argument('--input', action='append', required=True)
a = p.parse_args()
def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate key')
        result[key] = value
    return result
try:
    records = [json.load(open(path), object_pairs_hook=no_duplicates) for path in a.input]
    expected = dict(item.split('=', 1) for item in a.expect)
    failed = (len(records) != len(expected) or
              {r['repository'] for r in records} != set(expected) or
              any(r['commit_sha'] != expected.get(r['repository']) or
                  r['overall_status'] != 'passed' for r in records))
except (ValueError, KeyError, TypeError):
    failed = True
    records = []
print(json.dumps({'status':'failed' if failed else 'partial',
                  'provenance':'unsigned_supplied_json_not_authenticated',
                  'repositories':[{'status':'reported_checks_passed_with_gaps',
                                   'unverified_gates':['security:not_checked']} for r in records]}))
sys.exit(1 if failed else 0)
'''


class BridgeOriginalBytesTests(unittest.TestCase):
    def test_duplicate_key_cannot_be_erased_by_bridge(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "strict_consumer.py"
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"

            def record(repo):
                return {"repository": repo, "commit_sha": sha,
                        "overall_status": "passed",
                        "checks": [{"id": "check", "status": "passed", "exit_code": 0}]}

            vps.write_text(json.dumps(record("AIFreedomTrustFederation/VPS")))
            runtime.write_text(json.dumps(record("AIFreedomTrustFederation/AIFT-Runtime")))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)
            original = vps.read_text()
            vps.write_text(original[:-1] + ',"repository":"AIFreedomTrustFederation/VPS"}')
            invalid = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
            self.assertIn("Consumer exited 1", invalid.stderr)



if __name__ == "__main__":
    unittest.main()
