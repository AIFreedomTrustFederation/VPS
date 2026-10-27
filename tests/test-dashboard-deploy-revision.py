#!/usr/bin/env python3
"""Check that the VPS dashboard deployment cannot silently switch Git revisions."""

from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/deploy-aift-dashboard.yml"
START = '          DEPLOY_SHA="${{ github.sha }}"\n'
END = '          mkdir -p /opt/aift/registry'


class DashboardDeploymentRevisionTests(unittest.TestCase):
    def setUp(self):
        self.workflow = WORKFLOW.read_text(encoding="utf-8")
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.email", "ci@example.invalid")
        self.git("config", "user.name", "CI Test")
        self.commit("first")

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.repo, check=True,
                              text=True, capture_output=True).stdout.strip()

    def commit(self, text):
        (self.repo / "revision.txt").write_text(text, encoding="utf-8")
        self.git("add", "revision.txt")
        self.git("commit", "-qm", text)
        return self.git("rev-parse", "HEAD")

    def guard(self, expected_sha):
        self.assertEqual(self.workflow.count(START), 1)
        self.assertEqual(self.workflow.count(END), 1)
        start = self.workflow.index(START)
        end = self.workflow.index(END, start)
        self.assertLess(self.workflow.index("git pull --ff-only"), start)
        self.assertLess(end, self.workflow.index("docker compose -f compose.yml up"))
        return self.workflow[start:end].replace("${{ github.sha }}", expected_sha)

    def run_guard(self, expected_sha):
        return subprocess.run(["bash", "-c", "set -euo pipefail\n" + self.guard(expected_sha)],
                              cwd=self.repo, text=True, capture_output=True, check=False)

    def test_matching_workflow_revision_allows_deployment(self):
        self.assertEqual(self.run_guard(self.git("rev-parse", "HEAD")).returncode, 0)

    def test_remote_revision_drift_stops_deployment(self):
        dispatched_sha = self.git("rev-parse", "HEAD")
        self.commit("second")
        result = self.run_guard(dispatched_sha)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Refusing deployment", result.stderr)

    def test_unrelated_revision_stops_deployment(self):
        result = self.run_guard("0" * 40)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Refusing deployment", result.stderr)


    def auto_guard(self, expected_sha):
        workflow = (ROOT / ".github/workflows/aift-auto-pipeline.yml").read_text(
            encoding="utf-8"
        )
        self.assertEqual(workflow.count(START), 1)
        self.assertEqual(workflow.count(END), 1)
        start = workflow.index(START)
        end = workflow.index(END, start)
        self.assertLess(workflow.index("git pull --ff-only"), start)
        self.assertLess(end, workflow.index("docker compose -f compose.yml up"))
        self.assertIn("    needs: build-dashboard", workflow)
        return workflow[start:end].replace("${{ github.sha }}", expected_sha)

    def run_auto_guard(self, expected_sha):
        return subprocess.run(
            ["bash", "-c", "set -euo pipefail\n" + self.auto_guard(expected_sha)],
            cwd=self.repo, text=True, capture_output=True, check=False,
        )

    def test_auto_pipeline_matching_revision_allows_deployment(self):
        self.assertEqual(self.run_auto_guard(self.git("rev-parse", "HEAD")).returncode, 0)

    def test_auto_pipeline_remote_revision_drift_stops_deployment(self):
        dispatched_sha = self.git("rev-parse", "HEAD")
        self.commit("second")
        result = self.run_auto_guard(dispatched_sha)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Refusing deployment", result.stderr)

    def test_auto_pipeline_unrelated_revision_stops_deployment(self):
        result = self.run_auto_guard("0" * 40)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Refusing deployment", result.stderr)


if __name__ == "__main__":
    unittest.main()
