#!/usr/bin/env python3
"""Regression contract for commit-bound VPS Local QA results (no dependencies)."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/aift-local-qa.yml"
TEST_COMMAND = "python3 -B -m unittest discover -s tests -p 'test_local_qa_commit_binding.py' -v"


def run_git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


class CommitBinding(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
        cls.steps = workflow["jobs"]["local-qa"]["steps"]
        cls.gate = cls.steps[-1]["run"]

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        run_git(self.repo, "init", "-q")
        run_git(self.repo, "config", "user.email", "test@example.invalid")
        run_git(self.repo, "config", "user.name", "Regression Fixture")
        (self.repo / "tracked.txt").write_text("baseline\n", encoding="utf-8")
        run_git(self.repo, "add", "tracked.txt")
        run_git(self.repo, "commit", "-qm", "baseline")
        self.expected = run_git(self.repo, "rev-parse", "HEAD")

    def gate_result(self, expected=None):
        env = os.environ.copy()
        env.pop("GITHUB_SHA", None)
        if expected is not None:
            env["GITHUB_SHA"] = expected
        return subprocess.run(["bash", "-c", self.gate], cwd=self.repo,
                              env=env, text=True, capture_output=True, check=False)

    def test_workflow_wires_regression_before_final_gate(self):
        self.assertTrue(any(step.get("run") == TEST_COMMAND for step in self.steps[:-1]),
                        "Local QA must execute its commit-binding regressions")
        self.assertEqual(self.steps[-1]["name"], "Verify checkout and execution SHA")
        self.assertIn("GITHUB_SHA", self.gate)
        self.assertIn("git rev-parse HEAD", self.gate)
        self.assertIn("git status --porcelain", self.gate)

    def test_matching_clean_checkout_passes(self):
        self.assertEqual(self.gate_result(self.expected).returncode, 0)

    def test_clean_head_drift_fails(self):
        run_git(self.repo, "commit", "--allow-empty", "-qm", "advance HEAD")
        self.assertEqual(run_git(self.repo, "status", "--porcelain"), "")
        self.assertNotEqual(self.gate_result(self.expected).returncode, 0)

    def test_dirty_tracked_file_fails(self):
        (self.repo / "tracked.txt").write_text("modified\n", encoding="utf-8")
        self.assertNotEqual(self.gate_result(self.expected).returncode, 0)

    def test_untracked_file_fails(self):
        (self.repo / "untracked.txt").write_text("untracked\n", encoding="utf-8")
        self.assertNotEqual(self.gate_result(self.expected).returncode, 0)

    def test_missing_sha_fails(self):
        self.assertNotEqual(self.gate_result().returncode, 0)

    def test_unrelated_sha_fails(self):
        self.assertNotEqual(self.gate_result("0" * 40).returncode, 0)

    def test_outside_git_checkout_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            env = dict(os.environ, GITHUB_SHA=self.expected)
            result = subprocess.run(["bash", "-c", self.gate], cwd=temp,
                                    env=env, capture_output=True, text=True, check=False)
            self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
