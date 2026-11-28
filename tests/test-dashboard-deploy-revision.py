#!/usr/bin/env python3
"""Check VPS dashboard deploys bind to an explicit checkout path and SHA."""

from pathlib import Path
import subprocess
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
DEPLOY_WORKFLOW = ROOT / ".github/workflows/deploy-aift-dashboard.yml"
AUTO_WORKFLOW = ROOT / ".github/workflows/aift-auto-pipeline.yml"

CHECKOUT_SHA = "11d5960a326750d5838078e36cf38b85af677262"
SETUP_NODE_SHA = "49933ea5288caeca8642d1e84afbd3f7d6820020"
UPLOAD_ARTIFACT_SHA = "ea165f8d65b6e75b540449e92b4886f43607fa02"

BEGIN = "# begin-remote-deploy"
END = "# end-remote-deploy"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_marked(workflow: str) -> str:
    start = workflow.index(BEGIN)
    end = workflow.index(END, start) + len(END)
    block = workflow[start:end]
    return textwrap.dedent(block) + "\n"


class WorkflowContractTests(unittest.TestCase):
    def setUp(self):
        self.deploy = read(DEPLOY_WORKFLOW)
        self.auto = read(AUTO_WORKFLOW)

    def test_remote_guard_scripts_are_identical(self):
        self.assertEqual(extract_marked(self.deploy), extract_marked(self.auto))
        self.assertEqual(self.deploy.count(BEGIN), 1)
        self.assertEqual(self.auto.count(BEGIN), 1)

    def test_no_silent_clone_or_legacy_path_default(self):
        for name, text in ("deploy", self.deploy), ("auto", self.auto):
            with self.subTest(workflow=name):
                self.assertNotIn("git clone", text)
                self.assertNotIn("/root/VPS", text)
                self.assertNotIn("ssh-keyscan", text)
                self.assertNotIn("${VPS_APP_PATH:-", text)
                self.assertNotIn("${{ github.sha }}", text)
                self.assertIn('bash -s -- "$APP_DIR" "$DEPLOY_SHA"', text)
                self.assertIn("flock -w 1800 /var/lock/aift-dashboard-deploy.lock", text)
                self.assertIn("git fetch origin -- \"$DEPLOY_SHA\"", text)
                self.assertIn('git checkout --detach "$DEPLOY_SHA"', text)
                self.assertIn('secrets.VPS_APP_PATH', text)
                self.assertIn('secrets.VPS_KNOWN_HOSTS', text)

    def test_secrets_are_passed_through_env_not_interpolated_in_scripts(self):
        for name, text in ("deploy", self.deploy), ("auto", self.auto):
            with self.subTest(workflow=name):
                lines = text.splitlines()
                i = 0
                while i < len(lines):
                    stripped = lines[i].lstrip()
                    if stripped.startswith("run:"):
                        indent = len(lines[i]) - len(stripped)
                        i += 1
                        while i < len(lines):
                            raw = lines[i]
                            if raw.strip() and (len(raw) - len(raw.lstrip()) <= indent):
                                break
                            if "${{ secrets." in raw:
                                self.fail(f"{name} interpolates a secret inside a run script: {raw}")
                            i += 1
                        continue
                    i += 1
                self.assertIn("VPS_APP_PATH_VALUE: ${{ secrets.VPS_APP_PATH }}", text)
                self.assertIn("VPS_KNOWN_HOSTS_VALUE: ${{ secrets.VPS_KNOWN_HOSTS }}", text)
                self.assertIn("VPS_SSH_KEY_VALUE: ${{ secrets.VPS_SSH_KEY }}", text)

    def test_permissions_concurrency_and_main_guard(self):
        for name, text in ("deploy", self.deploy), ("auto", self.auto):
            with self.subTest(workflow=name):
                self.assertRegex(text, r"(?m)^permissions:\n  contents: read\n")
                self.assertIn("group: vps-dashboard-deploy", text)
                self.assertIn("cancel-in-progress: false", text)
                self.assertIn("github.ref == 'refs/heads/main'", text)

    def test_actions_are_pinned_to_verified_v4_shas(self):
        self.assertIn(f"actions/checkout@{CHECKOUT_SHA} # v4.4.0", self.deploy)
        self.assertIn(f"actions/setup-node@{SETUP_NODE_SHA} # v4.4.0", self.deploy)
        self.assertIn(f"actions/checkout@{CHECKOUT_SHA} # v4.4.0", self.auto)
        self.assertIn(f"actions/setup-node@{SETUP_NODE_SHA} # v4.4.0", self.auto)
        self.assertIn(f"actions/upload-artifact@{UPLOAD_ARTIFACT_SHA} # v4.6.2", self.auto)
        self.assertNotIn("actions/checkout@v", self.deploy)
        self.assertNotIn("actions/setup-node@v", self.deploy)
        self.assertNotIn("actions/checkout@v", self.auto)
        self.assertNotIn("actions/setup-node@v", self.auto)
        self.assertNotIn("actions/upload-artifact@v", self.auto)

    def test_auto_pipeline_still_skips_when_ssh_secrets_unset(self):
        self.assertIn('echo "ready=false" >> "$GITHUB_OUTPUT"', self.auto)
        self.assertIn('echo "ready=false" >> "$GITHUB_OUTPUT"', self.deploy)
        self.assertIn("Deployment skipped. Add VPS_HOST, VPS_USER, VPS_PORT, and VPS_SSH_KEY secrets.", self.auto)

    def test_known_hosts_and_empty_path_fail_closed(self):
        for text in (self.deploy, self.auto):
            self.assertIn("Refusing deployment: VPS_KNOWN_HOSTS secret is missing", text)
            self.assertIn("Refusing deployment: VPS_APP_PATH secret is empty", text)
            self.assertIn("StrictHostKeyChecking=yes", text)


class GitFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.origin = root / "origin.git"
        self.work = root / "work"
        self.server = root / "server"
        self.git(root, "init", "--bare", "-b", "main", str(self.origin))
        self.git(self.origin, "config", "uploadpack.allowReachableSHA1InWant", "true")
        self.git(root, "-c", "protocol.file.allow=always", "clone", "-q", str(self.origin), str(self.work))
        self.git(self.work, "config", "protocol.file.allow", "always")
        self.git(self.work, "config", "user.email", "ci@example.invalid")
        self.git(self.work, "config", "user.name", "CI Test")
        self.sha1 = self.commit(self.work, "first")
        self.git(self.work, "push", "-q", "origin", "main")
        self.git(root, "-c", "protocol.file.allow=always", "clone", "-q", str(self.origin), str(self.server))
        self.git(self.server, "config", "protocol.file.allow", "always")
        self.git(self.server, "config", "user.email", "ci@example.invalid")
        self.git(self.server, "config", "user.name", "CI Test")

    def git(self, cwd, *args, check=True):
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            text=True,
            capture_output=True,
            check=False,
        )
        if check and result.returncode != 0:
            self.fail(f"git {' '.join(args)} failed: {result.stderr}")
        return result.stdout.strip()

    def commit(self, repo: Path, text: str) -> str:
        (repo / "revision.txt").write_text(text, encoding="utf-8")
        self.git(repo, "add", "revision.txt")
        self.git(repo, "commit", "-qm", text)
        return self.git(repo, "rev-parse", "HEAD")

    def remote_script(self) -> str:
        return extract_marked(read(DEPLOY_WORKFLOW))

    def run_guard(self, app_dir, sha, script=None):
        body = script if script is not None else self.remote_script()
        return subprocess.run(
            ["bash", "-s", "--", str(app_dir), str(sha)],
            input=body,
            text=True,
            capture_output=True,
            check=False,
        )


class RemoteDeployGuardTests(GitFixture):
    def test_matching_sha_checks_out_detached_head(self):
        result = self.run_guard(self.server, self.sha1)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git(self.server, "rev-parse", "HEAD"), self.sha1)
        self.assertEqual(self.git(self.server, "rev-parse", "--abbrev-ref", "HEAD"), "HEAD")

    def test_older_dispatched_sha_is_fetched_and_checked_out(self):
        sha2 = self.commit(self.work, "second")
        self.git(self.work, "push", "-q", "origin", "main")
        self.git(self.server, "fetch", "-q", "origin")
        self.git(self.server, "merge", "--ff-only", "-q", "origin/main")
        self.assertEqual(self.git(self.server, "rev-parse", "HEAD"), sha2)
        result = self.run_guard(self.server, self.sha1)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git(self.server, "rev-parse", "HEAD"), self.sha1)

    def test_newer_sha_not_yet_on_server_is_fetched(self):
        sha2 = self.commit(self.work, "second")
        self.git(self.work, "push", "-q", "origin", "main")
        result = self.run_guard(self.server, sha2)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git(self.server, "rev-parse", "HEAD"), sha2)

    def test_unknown_sha_is_refused(self):
        missing = "0" * 40
        before = self.git(self.server, "rev-parse", "HEAD")
        result = self.run_guard(self.server, missing)
        self.assertEqual(result.returncode, 1)
        self.assertIn("cannot fetch", result.stderr)
        self.assertEqual(self.git(self.server, "rev-parse", "HEAD"), before)

    def test_invalid_sha_is_refused(self):
        result = self.run_guard(self.server, "not-a-sha")
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid commit SHA", result.stderr)

    def test_empty_app_dir_is_refused(self):
        result = self.run_guard("", self.sha1)
        self.assertEqual(result.returncode, 1)
        self.assertIn("VPS_APP_PATH is empty", result.stderr)

    def test_non_git_directory_is_refused(self):
        empty = Path(self.temp.name) / "empty"
        empty.mkdir()
        result = self.run_guard(empty, self.sha1)
        self.assertEqual(result.returncode, 1)
        self.assertIn("is not a git repository", result.stderr)

    def test_dirty_tracked_file_is_refused_without_changing_head(self):
        before = self.git(self.server, "rev-parse", "HEAD")
        (self.server / "revision.txt").write_text("tampered", encoding="utf-8")
        result = self.run_guard(self.server, self.sha1)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("dirty checkout", result.stderr)
        self.assertEqual(self.git(self.server, "rev-parse", "HEAD"), before)
        self.assertEqual((self.server / "revision.txt").read_text(encoding="utf-8"), "tampered")

    def test_untracked_file_is_refused(self):
        (self.server / "untracked-compose-override.yml").write_text("unsafe", encoding="utf-8")
        result = self.run_guard(self.server, self.sha1)
        self.assertEqual(result.returncode, 1)
        self.assertIn("dirty checkout", result.stderr)

    def test_auto_pipeline_script_matches_deploy_behavior(self):
        script = extract_marked(read(AUTO_WORKFLOW))
        result = self.run_guard(self.server, self.sha1, script=script)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git(self.server, "rev-parse", "HEAD"), self.sha1)


class RunnerSideGuardTests(unittest.TestCase):
    def local_validation(self) -> str:
        # The runner-side checks that happen before ssh in both workflows.
        return textwrap.dedent("""\
            set -Eeuo pipefail
            APP_DIR="$1"
            DEPLOY_SHA="$2"
            if [ -z "$APP_DIR" ]; then
              echo "Refusing deployment: VPS_APP_PATH secret is empty" >&2
              exit 1
            fi
            if [[ ! "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
              echo "Refusing deployment: VPS_APP_PATH must be an absolute path" >&2
              exit 1
            fi
            if [[ ! "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
              echo "Refusing deployment: GITHUB_SHA is missing or not a 40-character hex SHA" >&2
              exit 1
            fi
            echo ok
        """)

    def run_local(self, app_dir, sha):
        return subprocess.run(
            ["bash", "-s", "--", str(app_dir), str(sha)],
            input=self.local_validation(),
            text=True,
            capture_output=True,
            check=False,
        )

    def test_workflows_contain_the_same_runner_side_checks(self):
        for path in (DEPLOY_WORKFLOW, AUTO_WORKFLOW):
            text = read(path)
            self.assertIn('APP_DIR="$VPS_APP_PATH_VALUE"', text)
            self.assertIn('DEPLOY_SHA="$GITHUB_SHA"', text)
            self.assertIn("VPS_APP_PATH secret is empty", text)
            self.assertIn("VPS_APP_PATH must be an absolute path", text)
            self.assertIn("40-character hex SHA", text)

    def test_empty_and_relative_paths_are_rejected(self):
        sha = "a" * 40
        self.assertEqual(self.run_local("", sha).returncode, 1)
        result = self.run_local("relative/path", sha)
        self.assertEqual(result.returncode, 1)
        self.assertIn("absolute path", result.stderr)
        result = self.run_local("/root/AIFT/VPS; rm -rf /", sha)
        self.assertEqual(result.returncode, 1)
        ok = self.run_local("/root/AIFT/VPS", sha)
        self.assertEqual(ok.returncode, 0, ok.stderr)
        self.assertEqual(ok.stdout.strip(), "ok")

    def test_invalid_sha_is_rejected_before_ssh(self):
        result = self.run_local("/root/AIFT/VPS", "HEAD")
        self.assertEqual(result.returncode, 1)
        self.assertIn("40-character hex SHA", result.stderr)

    def test_missing_known_hosts_secret_fails_closed(self):
        script = textwrap.dedent("""\
            set -Eeuo pipefail
            if [ -z "${VPS_KNOWN_HOSTS_VALUE}" ]; then
              echo "Refusing deployment: VPS_KNOWN_HOSTS secret is missing" >&2
              exit 1
            fi
            mkdir -p ~/.ssh
            umask 077
            printf '%s\\n' "$VPS_SSH_KEY_VALUE" > ~/.ssh/aift_vps_key
            printf '%s\\n' "$VPS_KNOWN_HOSTS_VALUE" > ~/.ssh/known_hosts
            chmod 600 ~/.ssh/aift_vps_key ~/.ssh/known_hosts
        """)
        env_base = {"VPS_SSH_KEY_VALUE": "KEYMATERIAL"}
        with tempfile.TemporaryDirectory() as home:
            missing = subprocess.run(
                ["bash", "-c", script],
                env={**env_base, "VPS_KNOWN_HOSTS_VALUE": "", "HOME": home, "PATH": "/usr/bin:/bin"},
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(missing.returncode, 1)
            self.assertIn("VPS_KNOWN_HOSTS secret is missing", missing.stderr)
            present = subprocess.run(
                ["bash", "-c", script],
                env={
                    **env_base,
                    "VPS_KNOWN_HOSTS_VALUE": "example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAItest",
                    "HOME": home,
                    "PATH": "/usr/bin:/bin",
                },
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(present.returncode, 0, present.stderr)
            known = Path(home) / ".ssh" / "known_hosts"
            key = Path(home) / ".ssh" / "aift_vps_key"
            self.assertTrue(known.exists())
            self.assertIn("ssh-ed25519", known.read_text(encoding="utf-8"))
            self.assertEqual(oct(known.stat().st_mode)[-3:], "600")
            self.assertEqual(oct(key.stat().st_mode)[-3:], "600")


class PreflightDefaultTests(unittest.TestCase):
    def test_preflight_script_does_not_hardcode_root_vps_default(self):
        source = (ROOT / "scripts/aift-dashboard-security-preflight.py").read_text(encoding="utf-8")
        self.assertNotIn('default=Path("/root/VPS")', source)
        self.assertIn("def default_repo_path", source)


if __name__ == "__main__":
    unittest.main()
