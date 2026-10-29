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


if __name__ == "__main__":
    unittest.main()
