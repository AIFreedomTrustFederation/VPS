"""Real, isolated installer regressions for local node bearer-token confidentiality."""
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
INSTALLER = ROOT / "scripts" / "install-node-agent.sh"


class NodeAgentInstallerSecrets(unittest.TestCase):
    def setUp(self):
        if os.geteuid() != 0:
            self.skipTest("Installer requires root; hosted workflow runs this suite via sudo")
        self.temp = tempfile.TemporaryDirectory(prefix="aift-node-secret-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        source = self.base / "repo" / "apps" / "aift-node-agent"
        source.mkdir(parents=True)
        (source / "package.json").write_text('{"name":"fixture-node-agent"}\n')
        self.target = self.base / "install" / "node-agent" / ".env"
        self.token = "fixture-only-secret-not-a-production-credential"

    def install(self):
        env = dict(os.environ,
                   AIFT_REPO_DIR=str(self.base / "repo"),
                   AIFT_ROOT=str(self.base / "install"),
                   AIFT_NODE_NAME="fixture-node",
                   AIFT_CONTROL_PLANE_URL="https://example.invalid",
                   AIFT_NODE_TOKEN=self.token)
        return subprocess.run(["bash", str(INSTALLER)], env=env, text=True,
                              capture_output=True, timeout=15, check=True)

    def assert_secure(self, completed):
        self.assertEqual(stat.S_IMODE(self.target.stat().st_mode), 0o600,
                         "node-agent .env must be owner-readable only")
        self.assertIn(f'AIFT_NODE_TOKEN="{self.token}"', self.target.read_text())
        self.assertNotIn(self.token, completed.stdout + completed.stderr)
        self.assertEqual(list(self.target.parent.glob('.env.tmp.*')), [],
                         "temporary credential files must not remain")

    def test_fresh_install_never_exposes_node_token_file(self):
        self.assert_secure(self.install())

    def test_reinstall_replaces_preexisting_world_readable_env_securely(self):
        self.target.parent.mkdir(parents=True)
        self.target.write_text('AIFT_NODE_TOKEN="old-placeholder"\n')
        self.target.chmod(0o644)
        self.assert_secure(self.install())


    def test_reinstall_does_not_follow_env_symlink_outside_agent_dir(self):
        self.target.parent.mkdir(parents=True)
        outside = self.base / "outside.txt"
        outside.write_text("outside-file-must-not-change\n")
        self.target.symlink_to(outside)
        completed = self.install()
        self.assertEqual(outside.read_text(), "outside-file-must-not-change\n")
        self.assertFalse(self.target.is_symlink())
        self.assert_secure(completed)


if __name__ == "__main__":
    unittest.main()
