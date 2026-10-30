#!/usr/bin/env python3
"""Black-box regression tests for Federation checkout commit binding."""

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

GUARD = Path(__file__).with_name("check-federation-checkouts.py")


class CheckoutBindingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repos = []
        for name in ("vps", "runtime", "os"):
            path = self.root / name
            path.mkdir()
            self.git(path, "init", "-q")
            self.git(path, "config", "user.name", "Fixture")
            self.git(path, "config", "user.email", "fixture@example.invalid")
            (path / "README.md").write_text("fixture\n")
            self.git(path, "add", "README.md")
            self.git(path, "commit", "-qm", "initial")
            self.repos.append((path, self.git(path, "rev-parse", "HEAD").strip()))

    @staticmethod
    def git(path, *args):
        return subprocess.run(["git", *args], cwd=path, check=True,
                              capture_output=True, text=True).stdout

    def guard(self, overrides=None):
        overrides = overrides or {}
        command = [sys.executable, "-B", str(GUARD)]
        for path, sha in self.repos:
            command.extend(["--checkout", f"{path}={overrides.get(path.name, sha)}"])
        return subprocess.run(command, capture_output=True, text=True)

    def test_accepts_three_clean_pinned_checkouts(self):
        result = self.guard()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("3 pinned clean checkouts", result.stdout)

    def test_rejects_clean_checkout_that_advanced_to_new_commit(self):
        path, _ = self.repos[1]
        self.git(path, "commit", "--allow-empty", "-qm", "drift")
        self.assertEqual(self.git(path, "status", "--porcelain"), "")
        result = self.guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("differs from pinned", result.stderr)

    def test_rejects_dirty_checkout(self):
        path, _ = self.repos[2]
        (path / "unexpected").write_text("dirty")
        result = self.guard()
        self.assertEqual(result.returncode, 1)
        self.assertIn("checkout is dirty", result.stderr)

    def test_rejects_invalid_expected_sha(self):
        result = self.guard({"vps": "not-a-sha"})
        self.assertEqual(result.returncode, 1)
        self.assertIn("40 lowercase hex", result.stderr)

    def test_rejects_nonroot_directory(self):
        path, _ = self.repos[0]
        subdir = path / "child"
        subdir.mkdir()
        command = [sys.executable, "-B", str(GUARD), "--checkout", f"{subdir}={self.repos[0][1]}"]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn("not the checkout root", result.stderr)


if __name__ == "__main__":
    unittest.main()
