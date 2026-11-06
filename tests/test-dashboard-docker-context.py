#!/usr/bin/env python3
"""Regression checks for the dashboard Docker build-context secret boundary."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "apps/aift-dashboard"
IGNORE = DASHBOARD / ".dockerignore"


class DashboardDockerContextTests(unittest.TestCase):
    def test_context_has_explicit_secret_exclusions(self):
        self.assertTrue(IGNORE.is_file(), "dashboard build context has no .dockerignore")
        patterns = {
            line.strip() for line in IGNORE.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        }
        required = {
            ".env", ".env.*", "**/.env", "**/.env.*",
            "*.pem", "**/*.pem", "*.key", "**/*.key",
            ".npmrc", "**/.npmrc", "node_modules", "**/node_modules",
            ".next", "**/.next",
            ".ssh", "**/.ssh", ".aws", "**/.aws", ".kube", "**/.kube",
            "*.p8", "**/*.p8",
        }
        self.assertFalse(required - patterns, f"missing exclusions: {sorted(required - patterns)}")
        self.assertFalse(any(pattern.startswith("!") for pattern in patterns),
                         "negation rules can reinclude excluded credentials")

    def test_real_docker_context_excludes_secrets_but_keeps_source(self):
        # Docker's own matcher is authoritative. Hosted QA checks docker info
        # first; the isolated local environment may not have a Docker daemon.
        if shutil.which("docker") is None:
            self.skipTest("Docker unavailable in local environment")
        if subprocess.run(["docker", "info"], capture_output=True).returncode:
            self.skipTest("Docker daemon unavailable in local environment")
        with tempfile.TemporaryDirectory(prefix="aift-docker-context-") as tmp:
            context = Path(tmp) / "context"
            context.mkdir()
            shutil.copyfile(IGNORE, context / ".dockerignore")
            (context / "Dockerfile").write_text("FROM scratch\nCOPY . /probe\n", encoding="utf-8")
            cases = {
                "package.json": "{}", "src/keep.js": "export const safe = true;",
                ".env": "DO_NOT_PACKAGE=1", ".env.production": "DO_NOT_PACKAGE=1",
                "src/.env.local": "DO_NOT_PACKAGE=1", "server.pem": "DO_NOT_PACKAGE=1",
                "src/private.key": "DO_NOT_PACKAGE=1", ".npmrc": "DO_NOT_PACKAGE=1",
                "node_modules/secret.js": "DO_NOT_PACKAGE=1",
                "src/node_modules/secret.js": "DO_NOT_PACKAGE=1",
                ".next/cache/secret": "DO_NOT_PACKAGE=1",
                ".ssh/id_ed25519": "DO_NOT_PACKAGE=1",
                "src/.ssh/id_rsa": "DO_NOT_PACKAGE=1",
                ".aws/credentials": "DO_NOT_PACKAGE=1",
                "src/.aws/credentials": "DO_NOT_PACKAGE=1",
                ".kube/config": "DO_NOT_PACKAGE=1",
                "src/.kube/config": "DO_NOT_PACKAGE=1",
                "AuthKey_TEST.p8": "DO_NOT_PACKAGE=1",
            }
            for filename, value in cases.items():
                target = context / filename
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(value, encoding="utf-8")
            exported = Path(tmp) / "export"
            exported.mkdir()
            env = dict(os.environ, DOCKER_BUILDKIT="1")
            build = subprocess.run(
                ["docker", "build", "--progress=plain", "--output",
                 f"type=local,dest={exported}", str(context)],
                capture_output=True, text=True, env=env, timeout=120,
            )
            self.assertEqual(build.returncode, 0, build.stdout + build.stderr)
            root = exported / "probe"
            self.assertTrue((root / "package.json").is_file())
            self.assertTrue((root / "src/keep.js").is_file())
            for filename in cases:
                if filename not in ("package.json", "src/keep.js"):
                    self.assertFalse((root / filename).exists(),
                                     f"secret entered Docker context: {filename}")


if __name__ == "__main__":
    unittest.main()
