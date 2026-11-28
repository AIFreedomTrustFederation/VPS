#!/usr/bin/env python3
"""Regression tests for the VPS dashboard deploy workflows and their scripts.

Covers: exact-SHA deploys to an explicit path, pinned SSH host keys, the
VPS_DEPLOY_ENABLED gate, the protected production environment, bounded health
verification, deployment provenance, rollback, and fail-closed configuration.
"""

import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile
import unittest

try:
    import yaml
except ImportError:  # CI must have PyYAML; local runs without it skip only the YAML class.
    yaml = None

ROOT = Path(__file__).resolve().parents[1]
DEPLOY_WORKFLOW = ROOT / ".github/workflows/deploy-aift-dashboard.yml"
AUTO_WORKFLOW = ROOT / ".github/workflows/aift-auto-pipeline.yml"
REMOTE_SCRIPT = ROOT / "scripts/deploy-dashboard-remote.sh"
RUNNER_SCRIPT = ROOT / "scripts/deploy-dashboard-runner.sh"
SECRETS_DOC = ROOT / "docs/github-secrets.md"
ROLLBACK_DOC = ROOT / "docs/deploy-rollback.md"

CHECKOUT_SHA = "11d5960a326750d5838078e36cf38b85af677262"
SETUP_NODE_SHA = "49933ea5288caeca8642d1e84afbd3f7d6820020"
UPLOAD_ARTIFACT_SHA = "ea165f8d65b6e75b540449e92b4886f43607fa02"
RUN_URL = "https://github.com/AIFreedomTrustFederation/VPS/actions/runs/123456789"
ABSENT = object()


def read(path):
    return Path(path).read_text(encoding="utf-8")


def load_workflow(path):
    return yaml.safe_load(read(path))


def triggers(workflow):
    return workflow.get("on", workflow.get(True))


def run_scripts(workflow):
    for job_name, job in workflow["jobs"].items():
        for step in job.get("steps", []):
            if "run" in step:
                yield job_name, step.get("name", ""), step["run"]


# --------------------------------------------------------------------------- #
# Workflow structure                                                          #
# --------------------------------------------------------------------------- #
@unittest.skipIf(yaml is None and not os.environ.get("CI"), "PyYAML is not installed")
class WorkflowStructureTests(unittest.TestCase):
    BUILD_JOB = {"deploy": "verify-dashboard", "auto": "build-dashboard"}

    def setUp(self):
        self.assertIsNotNone(yaml, "PyYAML is required in CI")
        self.workflows = {"deploy": load_workflow(DEPLOY_WORKFLOW), "auto": load_workflow(AUTO_WORKFLOW)}
        self.texts = {"deploy": read(DEPLOY_WORKFLOW), "auto": read(AUTO_WORKFLOW)}

    def each(self):
        for name, workflow in self.workflows.items():
            with self.subTest(workflow=name):
                yield name, workflow

    def test_deploy_is_gated_on_repository_variable_and_split_from_build(self):
        for name, wf in self.each():
            jobs = wf["jobs"]
            gate, deploy, build = jobs["deploy-gate"], jobs["deploy-dashboard"], jobs[self.BUILD_JOB[name]]
            self.assertIn("vars.VPS_DEPLOY_ENABLED == 'true'", json.dumps(gate))
            self.assertEqual(gate["outputs"]["deploy"], "${{ steps.gate.outputs.deploy }}")
            self.assertEqual(deploy["if"], "needs.deploy-gate.outputs.deploy == 'true'")
            self.assertCountEqual(deploy["needs"], ["deploy-gate", self.BUILD_JOB[name]])
            # Only the gate reads the variable, and build/verify neither needs the gate nor deploy secrets.
            for job_name, job in jobs.items():
                if job_name != "deploy-gate":
                    self.assertNotIn("VPS_DEPLOY_ENABLED", json.dumps(job), job_name)
            self.assertNotIn("needs", build)
            self.assertNotIn("environment", build)
            self.assertNotIn("secrets.", json.dumps(build))
            self.assertNotIn("if", build)

    def test_deploy_job_uses_protected_production_environment(self):
        for name, wf in self.each():
            environment = wf["jobs"]["deploy-dashboard"]["environment"]
            self.assertEqual(environment["name"], "production")
            self.assertTrue(environment["url"].startswith("https://vps.aifreedomtrust.com"))
            for job_name, job in wf["jobs"].items():
                if job_name != "deploy-dashboard":
                    self.assertNotIn("environment", job, job_name)

    def test_concurrency_serializes_deploys_without_blocking_verification(self):
        for name, wf in self.each():
            self.assertNotIn("concurrency", wf, "workflow-level concurrency would block build/verify")
            concurrency = wf["jobs"]["deploy-dashboard"]["concurrency"]
            self.assertEqual(concurrency, {"group": "vps-dashboard-deploy", "cancel-in-progress": False})

    def test_permissions_are_read_only(self):
        for name, wf in self.each():
            self.assertEqual(wf["permissions"], {"contents": "read"})
            for job in wf["jobs"].values():
                self.assertNotIn("permissions", job)

    def test_actions_are_pinned_to_verified_shas(self):
        expected = {
            "actions/checkout": CHECKOUT_SHA,
            "actions/setup-node": SETUP_NODE_SHA,
            "actions/upload-artifact": UPLOAD_ARTIFACT_SHA,
        }
        for name, wf in self.each():
            for job in wf["jobs"].values():
                for step in job.get("steps", []):
                    if "uses" in step:
                        action, _, ref = step["uses"].partition("@")
                        self.assertRegex(ref, r"^[0-9a-f]{40}$", step["uses"])
                        self.assertEqual(ref, expected[action], step["uses"])
            self.assertNotRegex(self.texts[name], r"uses: [^\n]*@v\d")

    def test_checkouts_do_not_persist_credentials(self):
        for name, wf in self.each():
            for job in wf["jobs"].values():
                for step in job.get("steps", []):
                    if step.get("uses", "").startswith("actions/checkout@"):
                        self.assertIs(step["with"]["persist-credentials"], False)

    def test_secrets_and_inputs_are_never_interpolated_into_scripts(self):
        for name, wf in self.each():
            for job_name, step_name, script in run_scripts(wf):
                self.assertNotIn("${{", script, f"{name}/{job_name}/{step_name}")
            env = wf["jobs"]["deploy-dashboard"]["env"]
            for secret in ("VPS_HOST", "VPS_USER", "VPS_PORT", "VPS_SSH_KEY", "VPS_APP_PATH", "VPS_KNOWN_HOSTS"):
                self.assertEqual(env[secret], "${{ secrets.%s }}" % secret)

    def test_no_legacy_unsafe_behaviors(self):
        for name, text in self.texts.items():
            for forbidden in ("git clone", "/root/VPS", "ssh-keyscan", "${VPS_APP_PATH:-", "git pull"):
                self.assertNotIn(forbidden, text, f"{name}: {forbidden}")
        for path in (REMOTE_SCRIPT, RUNNER_SCRIPT):
            text = read(path)
            for forbidden in ("git clone", "/root/VPS", "ssh-keyscan", "git pull", "StrictHostKeyChecking=no"):
                self.assertNotIn(forbidden, text, f"{path.name}: {forbidden}")

    def test_deploy_steps_call_the_shared_scripts_in_order(self):
        for name, wf in self.each():
            commands = [s["run"].strip() for s in wf["jobs"]["deploy-dashboard"]["steps"] if "run" in s]
            self.assertEqual(
                commands,
                [
                    "bash scripts/deploy-dashboard-runner.sh validate",
                    "bash scripts/deploy-dashboard-runner.sh resolve-target",
                    "bash scripts/deploy-dashboard-runner.sh ssh-setup",
                    "bash scripts/deploy-dashboard-runner.sh deploy",
                    "bash scripts/deploy-dashboard-runner.sh summarize",
                ],
            )

    def test_provenance_is_summarized_and_uploaded_even_when_deploy_fails(self):
        for name, wf in self.each():
            steps = {s["name"]: s for s in wf["jobs"]["deploy-dashboard"]["steps"]}
            record = steps["Record deployment provenance"]
            upload = steps["Upload deployment record"]
            for step in (record, upload):
                self.assertIn("always()", step["if"])
                self.assertIn("steps.deploy.conclusion != 'skipped'", step["if"])
            self.assertEqual(upload["with"]["path"], "deployment-record.json")

    def test_deploy_env_carries_provenance_and_target(self):
        for name, wf in self.each():
            deploy = next(s for s in wf["jobs"]["deploy-dashboard"]["steps"] if s.get("id") == "deploy")
            env = deploy["env"]
            self.assertEqual(env["DEPLOY_SHA"], "${{ steps.target.outputs.sha }}")
            self.assertEqual(env["DEPLOY_ACTOR"], "${{ github.actor }}")
            self.assertEqual(env["DEPLOY_RUN_ID"], "${{ github.run_id }}")
            self.assertIn("actions/runs/${{ github.run_id }}", env["DEPLOY_RUN_URL"])

    def test_rollback_input_is_a_validated_string_passed_through_env(self):
        inputs = triggers(self.workflows["deploy"])["workflow_dispatch"]["inputs"]
        self.assertEqual(set(inputs), {"rollback_sha"})
        self.assertEqual(inputs["rollback_sha"]["type"], "string")
        self.assertEqual(inputs["rollback_sha"]["default"], "")
        self.assertIs(inputs["rollback_sha"]["required"], False)
        target = next(s for s in self.workflows["deploy"]["jobs"]["deploy-dashboard"]["steps"] if s.get("id") == "target")
        self.assertEqual(target["env"]["ROLLBACK_SHA"], "${{ inputs.rollback_sha }}")
        self.assertEqual(self.texts["deploy"].count("inputs.rollback_sha"), 1)
        # The ancestor check needs history.
        checkout = self.workflows["deploy"]["jobs"]["deploy-dashboard"]["steps"][0]
        self.assertEqual(checkout["with"]["fetch-depth"], 0)
        self.assertNotIn("inputs", triggers(self.workflows["auto"])["workflow_dispatch"] or {})

    def test_auto_pipeline_triggers_and_build_verification_remain(self):
        auto = self.workflows["auto"]
        self.assertEqual(triggers(auto)["push"]["branches"], ["main"])
        steps = [s.get("name") for s in auto["jobs"]["build-dashboard"]["steps"]]
        for expected in ("Install dependencies", "Build dashboard", "Upload build logs"):
            self.assertIn(expected, steps)

    def test_deploy_workflow_still_builds_before_deploy(self):
        steps = [s.get("name") for s in self.workflows["deploy"]["jobs"]["verify-dashboard"]["steps"]]
        self.assertIn("Install dependencies", steps)
        self.assertIn("Build before deploy", steps)


@unittest.skipIf(yaml is None and not os.environ.get("CI"), "PyYAML is not installed")
class GateBehaviorTests(unittest.TestCase):
    def gate_script(self, path):
        return load_workflow(path)["jobs"]["deploy-gate"]["steps"][0]["run"]

    def run_gate(self, path, enabled, event, ref):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "output"
            result = subprocess.run(
                ["bash", "-c", self.gate_script(path)],
                env={
                    "PATH": os.environ["PATH"],
                    "GITHUB_OUTPUT": str(out),
                    "GATE_ENABLED": enabled,
                    "EVENT_NAME": event,
                    "REF_FULL": ref,
                },
                text=True,
                capture_output=True,
            )
            return result, out.read_text() if out.exists() else ""

    def test_gate_matrix(self):
        main = "refs/heads/main"
        cases = [
            # enabled, event, ref -> exit code, deploy output
            ("true", "push", main, 0, "deploy=true"),
            ("true", "workflow_dispatch", main, 0, "deploy=true"),
            ("false", "push", main, 0, "deploy=false"),  # automatic: skip with notice
            ("false", "workflow_dispatch", main, 1, "deploy=false"),  # manual: fail
            ("true", "workflow_dispatch", "refs/heads/feature", 1, "deploy=false"),
            ("", "workflow_dispatch", main, 1, "deploy=false"),
            ("", "push", main, 0, "deploy=false"),
        ]
        for path in (DEPLOY_WORKFLOW, AUTO_WORKFLOW):
            for enabled, event, ref, code, expected in cases:
                with self.subTest(workflow=path.name, enabled=enabled, event=event, ref=ref):
                    result, output = self.run_gate(path, enabled, event, ref)
                    self.assertEqual(result.returncode, code, result.stderr)
                    self.assertIn(expected, output.splitlines())
                    if code:
                        self.assertIn("::error::", result.stderr)
                    elif expected == "deploy=false":
                        self.assertIn("::notice::", result.stdout)


# --------------------------------------------------------------------------- #
# Runner-side script                                                          #
# --------------------------------------------------------------------------- #
class RunnerBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.ssh_dir = self.root / "ssh"
        self.github_output = self.root / "github_output"
        self.summary = self.root / "summary.md"
        self.bin = self.root / "bin"
        self.bin.mkdir()

    def env(self, **extra):
        env = {
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "HOME": str(self.root),
            "AIFT_SSH_DIR": str(self.ssh_dir),
            "GITHUB_OUTPUT": str(self.github_output),
            "GITHUB_STEP_SUMMARY": str(self.summary),
        }
        for key, value in extra.items():
            if value is ABSENT:
                env.pop(key, None)
            else:
                env[key] = value
        return env

    def runner(self, command, cwd=None, **extra):
        return subprocess.run(
            ["bash", str(RUNNER_SCRIPT), command],
            env=self.env(**extra),
            cwd=cwd or self.root,
            text=True,
            capture_output=True,
        )

    def stub(self, name, body):
        path = self.bin / name
        path.write_text("#!/usr/bin/env bash\n" + body, encoding="utf-8")
        path.chmod(path.stat().st_mode | stat.S_IEXEC)


FULL_CONFIG = {
    "VPS_HOST": "vps.example.invalid",
    "VPS_USER": "root",
    "VPS_SSH_KEY": "-----BEGIN KEY-----\nPRIVATE-KEY-MATERIAL\n-----END KEY-----",
    "VPS_APP_PATH": "/root/AIFT/VPS",
    "VPS_KNOWN_HOSTS": "vps.example.invalid ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKnownHostKeyForTests0123456789abcdefgh",
}


class RunnerConfigTests(RunnerBase):
    def test_complete_configuration_passes(self):
        result = self.runner("validate", **FULL_CONFIG)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_each_missing_required_value_fails_and_is_named(self):
        for name in FULL_CONFIG:
            with self.subTest(missing=name):
                result = self.runner("validate", **{**FULL_CONFIG, name: ""})
                self.assertEqual(result.returncode, 1)
                self.assertIn(name, result.stderr)
                self.assertIn("Refusing deployment", result.stderr)

    def test_all_missing_are_listed_and_values_never_printed(self):
        result = self.runner("validate", **{k: "" for k in FULL_CONFIG})
        self.assertEqual(result.returncode, 1)
        for name in FULL_CONFIG:
            self.assertIn(name, result.stderr)
        result = self.runner("validate", **{**FULL_CONFIG, "VPS_APP_PATH": "relative/path"})
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("PRIVATE-KEY-MATERIAL", result.stdout + result.stderr)

    def test_malformed_values_are_rejected(self):
        bad = [
            {"VPS_APP_PATH": "relative"},
            {"VPS_APP_PATH": "/root/VPS; rm -rf /"},
            {"VPS_APP_PATH": "/root/$(id)"},
            {"VPS_HOST": "-oProxyCommand=evil"},
            {"VPS_HOST": "host name"},
            {"VPS_USER": "root;id"},
            {"VPS_USER": "-l"},
            {"VPS_PORT": "0"},
            {"VPS_PORT": "65536"},
            {"VPS_PORT": "22; id"},
            {"VPS_PORT": "abc"},
        ]
        for override in bad:
            with self.subTest(override=override):
                result = self.runner("validate", **{**FULL_CONFIG, **override})
                self.assertEqual(result.returncode, 1, result.stdout)

    def test_port_is_optional_and_numeric_ports_pass(self):
        for port in ("", "22", "2222", "65535"):
            with self.subTest(port=port):
                self.assertEqual(self.runner("validate", **{**FULL_CONFIG, "VPS_PORT": port}).returncode, 0)


@unittest.skipUnless(shutil.which("ssh-keygen"), "ssh-keygen is required")
class RunnerKnownHostsTests(RunnerBase):
    KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKnownHostKeyForTests0123456789abcdefgh"

    def setup_ssh(self, known_hosts, port=""):
        return self.runner("ssh-setup", **{**FULL_CONFIG, "VPS_KNOWN_HOSTS": known_hosts, "VPS_PORT": port})

    def test_default_port_uses_plain_host_entry(self):
        result = self.setup_ssh(f"vps.example.invalid {self.KEY}")
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in ("aift_vps_key", "aift_known_hosts"):
            self.assertEqual(oct((self.ssh_dir / name).stat().st_mode)[-3:], "600")
        self.assertIn("PRIVATE-KEY-MATERIAL", (self.ssh_dir / "aift_vps_key").read_text())

    def test_nonstandard_port_requires_bracketed_entry(self):
        ok = self.setup_ssh(f"[vps.example.invalid]:2222 {self.KEY}", port="2222")
        self.assertEqual(ok.returncode, 0, ok.stderr)
        plain = self.setup_ssh(f"vps.example.invalid {self.KEY}", port="2222")
        self.assertEqual(plain.returncode, 1)
        self.assertIn("[host]:port", plain.stderr)

    def test_entry_for_a_different_host_is_rejected(self):
        result = self.setup_ssh(f"other.example.invalid {self.KEY}")
        self.assertEqual(result.returncode, 1)
        self.assertIn("no entry", result.stderr)

    def test_key_material_is_not_logged(self):
        result = self.setup_ssh(f"other.example.invalid {self.KEY}")
        self.assertNotIn("PRIVATE-KEY-MATERIAL", result.stdout + result.stderr)


class RunnerTargetTests(RunnerBase):
    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.repo, text=True, capture_output=True, check=True).stdout.strip()

    def setUp(self):
        super().setUp()
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "ci@example.invalid")
        self.git("config", "user.name", "CI Test")
        self.shas = []
        for n in range(3):
            (self.repo / "f.txt").write_text(str(n))
            self.git("add", "f.txt")
            self.git("commit", "-qm", f"c{n}")
            self.shas.append(self.git("rev-parse", "HEAD"))
        self.git("update-ref", "refs/remotes/origin/main", self.shas[2])
        # A commit that is NOT on main.
        self.git("checkout", "-q", "-b", "side", self.shas[0])
        (self.repo / "g.txt").write_text("x")
        self.git("add", "g.txt")
        self.git("commit", "-qm", "side")
        self.side = self.git("rev-parse", "HEAD")

    def resolve(self, rollback, event="workflow_dispatch", sha=None):
        self.github_output.write_text("")
        result = self.runner(
            "resolve-target", cwd=self.repo, GITHUB_SHA=sha or self.shas[2], EVENT_NAME=event, ROLLBACK_SHA=rollback
        )
        return result, self.github_output.read_text().splitlines()

    def test_empty_rollback_deploys_the_run_commit(self):
        result, out = self.resolve("")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(out, [f"sha={self.shas[2]}", "rollback=false"])

    def test_ancestor_of_main_is_accepted_as_rollback(self):
        result, out = self.resolve(self.shas[0])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(out, [f"sha={self.shas[0]}", "rollback=true"])

    def test_invalid_rollback_values_are_rejected(self):
        bad = [
            self.shas[0].upper(),
            self.shas[0][:39],
            self.shas[0] + "0",
            "HEAD",
            "main",
            "origin/main",
            "0" * 40,  # well-formed but not a commit
            f"{self.shas[0]}; id",
            f"{self.shas[0]} {self.shas[1]}",
            "$(id)",
            "--help",
            " ",
        ]
        for value in bad:
            with self.subTest(value=value):
                result, out = self.resolve(value)
                self.assertEqual(result.returncode, 1, result.stdout)
                self.assertEqual(out, [])

    def test_commit_not_on_main_is_rejected(self):
        result, _ = self.resolve(self.side)
        self.assertEqual(result.returncode, 1)
        self.assertIn("not an ancestor of main", result.stderr)

    def test_rollback_is_refused_for_automatic_runs(self):
        result, out = self.resolve(self.shas[0], event="push")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(out, [])

    def test_invalid_run_commit_is_rejected(self):
        result, _ = self.resolve("", sha="not-a-sha")
        self.assertEqual(result.returncode, 1)


class RunnerDeployTests(RunnerBase):
    BASE = {
        **FULL_CONFIG,
        "DEPLOY_SHA": "a" * 40,
        "DEPLOY_RUN_ID": "123456789",
        "DEPLOY_RUN_URL": RUN_URL,
        "DEPLOY_ACTOR": "AIFreedomTrustFederation",
        "DEPLOY_EVENT": "workflow_dispatch",
        "DEPLOY_ROLLBACK": "false",
    }

    def setUp(self):
        super().setUp()
        self.ssh_log = self.root / "ssh.log"
        self.ssh_stdin = self.root / "ssh.stdin"
        self.stub(
            "ssh",
            f'printf "%s\\n" "$@" > "{self.ssh_log}"\ncat > "{self.ssh_stdin}"\n'
            'echo \'AIFT_DEPLOY_RECORD {"status":"healthy"}\'\nexit "${STUB_SSH_RC:-0}"\n',
        )

    def deploy(self, **extra):
        return self.runner("deploy", DEPLOY_OUTPUT=str(self.root / "out.log"), **{**self.BASE, **extra})

    def test_ssh_invocation_is_pinned_quoted_and_locked(self):
        result = self.deploy(DEPLOY_ACTOR="dependabot[bot]", VPS_PORT="2222")
        self.assertEqual(result.returncode, 0, result.stderr)
        args = self.ssh_log.read_text().splitlines()
        for option in ("StrictHostKeyChecking=yes", "IdentitiesOnly=yes", "BatchMode=yes"):
            self.assertIn(option, args)
        self.assertIn(f"UserKnownHostsFile={self.ssh_dir}/aift_known_hosts", args)
        self.assertEqual(args[args.index("-p") + 1], "2222")
        self.assertIn("root@vps.example.invalid", args)
        remote = args[-1]
        self.assertTrue(remote.startswith("flock -w 1800 /var/lock/aift-dashboard-deploy.lock bash -s -- "))
        self.assertIn("'/root/AIFT/VPS' '" + "a" * 40 + "' '123456789' '" + RUN_URL + "' 'dependabot[bot]' 'workflow_dispatch' 'false'", remote)
        self.assertEqual(self.ssh_stdin.read_text(), read(REMOTE_SCRIPT))

    def test_remote_failure_fails_the_step_and_keeps_output(self):
        result = self.deploy(STUB_SSH_RC="1")
        self.assertEqual(result.returncode, 1)
        self.assertIn("AIFT_DEPLOY_RECORD", (self.root / "out.log").read_text())

    def test_invalid_metadata_never_reaches_ssh(self):
        bad = [
            {"DEPLOY_SHA": "HEAD"},
            {"DEPLOY_SHA": "A" * 40},
            {"DEPLOY_RUN_ID": "12; id"},
            {"DEPLOY_RUN_URL": "https://evil.example/actions/runs/1"},
            {"DEPLOY_RUN_URL": RUN_URL + "'; id; '"},
            {"DEPLOY_ACTOR": "bob'; id; '"},
            {"DEPLOY_ACTOR": "bob smith"},
            {"DEPLOY_EVENT": "pull_request"},
            {"DEPLOY_ROLLBACK": "yes"},
            {"VPS_APP_PATH": "/root/x'; id; '"},
        ]
        for override in bad:
            with self.subTest(override=override):
                if self.ssh_log.exists():
                    self.ssh_log.unlink()
                result = self.deploy(**override)
                self.assertEqual(result.returncode, 1)
                self.assertFalse(self.ssh_log.exists(), "ssh must not run with invalid input")


class RunnerSummaryTests(RunnerBase):
    def test_record_is_written_to_summary_and_file(self):
        out = self.root / "out.log"
        record = '{"status":"healthy","deployed_sha":"%s"}' % ("a" * 40)
        out.write_text(f"noise\nAIFT_DEPLOY_RECORD {record}\n")
        result = self.runner("summarize", DEPLOY_OUTPUT=str(out), DEPLOY_RECORD_FILE=str(self.root / "rec.json"))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "rec.json").read_text().strip(), record)
        self.assertIn(record, self.summary.read_text())

    def test_missing_record_is_reported_without_failing(self):
        out = self.root / "out.log"
        out.write_text("ssh: connect to host failed\n")
        result = self.runner("summarize", DEPLOY_OUTPUT=str(out), DEPLOY_RECORD_FILE=str(self.root / "rec.json"))
        self.assertEqual(result.returncode, 0)
        self.assertFalse((self.root / "rec.json").exists())
        self.assertIn("No provenance record", self.summary.read_text())

    def test_record_that_could_break_the_markdown_fence_is_not_published(self):
        out = self.root / "out.log"
        out.write_text('AIFT_DEPLOY_RECORD {"x":"```"}\n')
        self.runner("summarize", DEPLOY_OUTPUT=str(out), DEPLOY_RECORD_FILE=str(self.root / "rec.json"))
        self.assertNotIn("```json", self.summary.read_text())


# --------------------------------------------------------------------------- #
# Remote (server-side) script                                                 #
# --------------------------------------------------------------------------- #
class RemoteFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.root = root
        self.origin = root / "origin.git"
        self.work = root / "work"
        self.server = root / "server"
        self.opt = root / "opt-aift"
        self.state = root / "state"
        self.bin = root / "bin"
        self.stub_log = root / "stub.log"
        self.curl_count = root / "curl.count"
        self.bin.mkdir()
        self.git(root, "init", "-q", "--bare", "-b", "main", str(self.origin))
        self.git(self.origin, "config", "uploadpack.allowReachableSHA1InWant", "true")
        self.git(root, "-c", "protocol.file.allow=always", "clone", "-q", str(self.origin), str(self.work))
        self.git(self.work, "config", "user.email", "ci@example.invalid")
        self.git(self.work, "config", "user.name", "CI Test")
        (self.work / "registry-examples").mkdir()
        for name in ("nodes", "templates", "builds", "deployments"):
            (self.work / "registry-examples" / f"{name}.yml").write_text(f"{name}: []\n")
        (self.work / "apps/aift-dashboard").mkdir(parents=True)
        (self.work / "apps/aift-dashboard/compose.yml").write_text("services: {}\n")
        self.sha1 = self.commit("first")
        self.git(self.work, "push", "-q", "origin", "main")
        self.git(root, "-c", "protocol.file.allow=always", "clone", "-q", str(self.origin), str(self.server))
        self.git(self.server, "config", "user.email", "ci@example.invalid")
        self.git(self.server, "config", "user.name", "CI Test")
        self.stub("docker", self.DOCKER_STUB)
        self.stub("curl", self.CURL_STUB)

    DOCKER_STUB = (
        'echo "docker $*" >> "$STUB_LOG"\n'
        'if [ "$1" = "inspect" ]; then echo "${STUB_CONTAINER_STATE-true false}"; exit 0; fi\n'
        'if [ "$1" = "compose" ] && [[ " $* " == *" up "* ]] && [ -n "${STUB_COMPOSE_FAIL:-}" ]; then exit 1; fi\n'
        "exit 0\n"
    )
    CURL_STUB = (
        'echo "curl $*" >> "$STUB_LOG"\n'
        'n=$(( $(cat "$STUB_CURL_COUNT" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$STUB_CURL_COUNT"\n'
        '[ -z "${STUB_CURL_FAIL:-}" ] || exit 22\n'
        '[ "$n" -gt "${STUB_CURL_OK_AFTER:-0}" ] || exit 7\n'
        'echo \'{"ok":true,"status":"warning"}\'\n'
    )

    def stub(self, name, body):
        path = self.bin / name
        path.write_text("#!/usr/bin/env bash\n" + body, encoding="utf-8")
        path.chmod(path.stat().st_mode | stat.S_IEXEC)

    def git(self, cwd, *args):
        result = subprocess.run(["git", *args], cwd=cwd, text=True, capture_output=True)
        if result.returncode != 0:
            self.fail(f"git {' '.join(args)} failed: {result.stderr}")
        return result.stdout.strip()

    def commit(self, text):
        (self.work / "revision.txt").write_text(text, encoding="utf-8")
        self.git(self.work, "add", "-A")
        self.git(self.work, "commit", "-qm", text)
        return self.git(self.work, "rev-parse", "HEAD")

    def push_commit(self, text):
        sha = self.commit(text)
        self.git(self.work, "push", "-q", "origin", "main")
        return sha

    def head(self):
        return self.git(self.server, "rev-parse", "HEAD")

    def run_remote(self, sha, app_dir=None, rollback="false", run_id="123456789", run_url=RUN_URL,
                   actor="AIFreedomTrustFederation", event="workflow_dispatch", script=None, **env):
        full_env = {
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "HOME": str(self.root),
            "AIFT_OPT_DIR": str(self.opt),
            "AIFT_DEPLOY_STATE_DIR": str(self.state),
            "AIFT_HEALTH_ATTEMPTS": "3",
            "AIFT_HEALTH_INTERVAL_S": "0",
            "AIFT_HEALTH_TIMEOUT_S": "2",
            "STUB_LOG": str(self.stub_log),
            "STUB_CURL_COUNT": str(self.curl_count),
        }
        full_env.update(env)
        args = [str(app_dir if app_dir is not None else self.server), sha, run_id, run_url, actor, event, rollback]
        return subprocess.run(
            ["bash", "-s", "--", *args],
            input=read(script or REMOTE_SCRIPT),
            env=full_env,
            text=True,
            capture_output=True,
        )

    def records(self):
        log = self.state / "deployments.jsonl"
        if not log.exists():
            return []
        return [json.loads(line) for line in log.read_text().splitlines() if line]

    def stub_calls(self, prefix):
        if not self.stub_log.exists():
            return []
        return [line for line in self.stub_log.read_text().splitlines() if line.startswith(prefix)]


class RemoteDeployTests(RemoteFixture):
    def test_exact_sha_is_checked_out_detached_deployed_and_verified(self):
        sha2 = self.push_commit("second")
        result = self.run_remote(sha2)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.head(), sha2)
        self.assertEqual(self.git(self.server, "rev-parse", "--abbrev-ref", "HEAD"), "HEAD")
        self.assertTrue(any("up -d --build" in c for c in self.stub_calls("docker compose")))
        self.assertTrue((self.opt / "registry/apps.yml").exists())
        self.assertTrue((self.opt / "registry/nodes.yml").exists())

    def test_newer_sha_not_on_the_server_is_fetched_and_explicit_older_sha_rollback_works(self):
        sha2 = self.push_commit("second")
        self.assertEqual(self.run_remote(sha2).returncode, 0)
        result = self.run_remote(self.sha1, rollback="true")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.head(), self.sha1)

    def test_provenance_record_has_all_fields_and_is_append_only(self):
        sha2 = self.push_commit("second")
        sha3 = self.push_commit("third")
        self.assertEqual(self.run_remote(sha2, run_id="111", run_url=RUN_URL.replace("123456789", "111")).returncode, 0)
        first_line = (self.state / "deployments.jsonl").read_text().splitlines()[0]
        result = self.run_remote(sha3, actor="dependabot[bot]", event="push")
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = (self.state / "deployments.jsonl").read_text().splitlines()
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0], first_line, "earlier records must never be rewritten")
        one, two = (json.loads(line) for line in lines)
        self.assertEqual(one["previous_sha"], self.sha1)
        self.assertEqual(one["deployed_sha"], sha2)
        self.assertEqual(two["previous_sha"], sha2)
        self.assertEqual(two["deployed_sha"], sha3)
        self.assertEqual(two["server_head"], sha3)
        self.assertEqual(
            set(two),
            {"timestamp_utc", "status", "deployed_sha", "previous_sha", "server_head", "run_id", "run_url", "actor", "event", "rollback"},
        )
        self.assertEqual((two["status"], two["run_id"], two["actor"], two["event"], two["rollback"]), ("healthy", "123456789", "dependabot[bot]", "push", False))
        self.assertEqual(two["run_url"], RUN_URL)
        self.assertRegex(two["timestamp_utc"], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
        self.assertIn("AIFT_DEPLOY_RECORD " + lines[1], result.stdout.splitlines())

    def test_rollback_flag_is_recorded(self):
        sha2 = self.push_commit("second")
        self.run_remote(sha2)
        self.assertEqual(self.run_remote(self.sha1, rollback="true").returncode, 0)
        last = self.records()[-1]
        self.assertTrue(last["rollback"])
        self.assertEqual(last["previous_sha"], sha2)
        self.assertEqual(last["deployed_sha"], self.sha1)

    def test_downgrade_without_rollback_is_refused_and_recorded(self):
        sha2 = self.push_commit("second")
        self.assertEqual(self.run_remote(sha2).returncode, 0)
        result = self.run_remote(self.sha1, rollback="false")
        self.assertEqual(result.returncode, 1)
        self.assertIn("rollback_sha", result.stderr)
        self.assertEqual(self.head(), sha2)
        self.assertEqual(self.records()[-1]["status"], "refused_downgrade")

    def test_redeploying_the_current_sha_is_allowed(self):
        self.assertEqual(self.run_remote(self.sha1).returncode, 0)
        self.assertEqual(self.run_remote(self.sha1).returncode, 0)

    def test_guards_refuse_without_changing_the_server(self):
        before = self.head()
        empty = self.root / "empty"
        empty.mkdir()
        cases = {
            "unknown sha": dict(sha="0" * 40),
            "invalid sha": dict(sha="not-a-sha"),
            "uppercase sha": dict(sha=self.sha1.upper()),
            "empty path": dict(sha=self.sha1, app_dir=""),
            "relative path": dict(sha=self.sha1, app_dir="relative/repo"),
            "not a git repo": dict(sha=self.sha1, app_dir=empty),
            "bad run id": dict(sha=self.sha1, run_id="1; id"),
            "bad run url": dict(sha=self.sha1, run_url="https://example.invalid/x"),
            "bad actor": dict(sha=self.sha1, actor="x'; id; '"),
            "bad event": dict(sha=self.sha1, event="schedule"),
            "bad rollback flag": dict(sha=self.sha1, rollback="maybe"),
        }
        for label, kwargs in cases.items():
            with self.subTest(label):
                result = self.run_remote(**kwargs)
                self.assertEqual(result.returncode, 1, result.stdout)
                self.assertIn("Refusing deployment", result.stderr)
                self.assertEqual(self.head(), before)
        self.assertEqual(self.stub_calls("docker"), [])

    def test_dirty_tracked_and_untracked_files_are_refused(self):
        sha2 = self.push_commit("second")
        for label, mutate in (
            ("tracked", lambda: (self.server / "revision.txt").write_text("tampered")),
            ("untracked", lambda: (self.server / "compose.override.yml").write_text("unsafe")),
        ):
            with self.subTest(label):
                mutate()
                before = self.head()
                result = self.run_remote(sha2)
                self.assertEqual(result.returncode, 1)
                self.assertIn("dirty checkout", result.stderr)
                self.assertEqual(self.head(), before)
                self.git(self.server, "checkout", "--", ".")
                self.git(self.server, "clean", "-fdq")
        self.assertEqual(self.stub_calls("docker"), [])

    def test_unwritable_provenance_location_refuses_before_changing_anything(self):
        sha2 = self.push_commit("second")
        self.state.write_text("a file, not a directory")
        before = self.head()
        result = self.run_remote(sha2)
        self.assertEqual(result.returncode, 1)
        self.assertIn("provenance", result.stderr)
        self.assertEqual(self.head(), before)
        self.assertEqual(self.stub_calls("docker"), [])

    def test_compose_failure_fails_and_is_recorded(self):
        sha2 = self.push_commit("second")
        result = self.run_remote(sha2, STUB_COMPOSE_FAIL="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.records()[-1]["status"], "failed")
        self.assertEqual(self.stub_calls("curl"), [])


class RemoteHealthTests(RemoteFixture):
    def test_health_check_uses_loopback_timeout_and_requires_ok_body(self):
        sha2 = self.push_commit("second")
        self.assertEqual(self.run_remote(sha2).returncode, 0)
        calls = self.stub_calls("curl")
        self.assertEqual(len(calls), 1)
        self.assertIn("http://127.0.0.1:3000/api/health", calls[0])
        self.assertIn("--max-time 2", calls[0])
        self.assertIn("-fsS", calls[0])
        self.assertTrue(any("inspect" in c for c in self.stub_calls("docker")))

    def test_health_is_retried_a_bounded_number_of_times_then_succeeds(self):
        sha2 = self.push_commit("second")
        result = self.run_remote(sha2, STUB_CURL_OK_AFTER="2")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.stub_calls("curl")), 3)
        self.assertEqual(self.records()[-1]["status"], "healthy")

    def test_unhealthy_dashboard_fails_after_exactly_the_attempt_budget(self):
        sha2 = self.push_commit("second")
        result = self.run_remote(sha2, STUB_CURL_FAIL="1", AIFT_HEALTH_ATTEMPTS="4")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(self.stub_calls("curl")), 4)
        self.assertIn("did not become healthy within 4 attempts", result.stderr)
        self.assertEqual(self.records()[-1]["status"], "unhealthy")
        self.assertEqual(self.records()[-1]["deployed_sha"], sha2)

    def test_stopped_or_restarting_container_is_unhealthy_even_if_http_answers(self):
        sha2 = self.push_commit("second")
        for state in ("false false", "true true", ""):
            with self.subTest(state=state):
                self.curl_count.unlink(missing_ok=True)
                result = self.run_remote(sha2, STUB_CONTAINER_STATE=state)
                self.assertEqual(result.returncode, 1)
                self.assertEqual(self.records()[-1]["status"], "unhealthy")
                self.assertEqual(self.stub_calls("curl"), [])
                self.stub_log.unlink(missing_ok=True)

    def test_health_response_without_ok_true_is_not_healthy(self):
        sha2 = self.push_commit("second")
        self.stub("curl", 'echo "curl $*" >> "$STUB_LOG"\necho \'{"ok":false}\'\n')
        result = self.run_remote(sha2)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(self.records()[-1]["status"], "unhealthy")

    def test_health_budget_must_be_bounded(self):
        sha2 = self.push_commit("second")
        before = self.head()
        for name, value in (
            ("AIFT_HEALTH_ATTEMPTS", "0"),
            ("AIFT_HEALTH_ATTEMPTS", "61"),
            ("AIFT_HEALTH_ATTEMPTS", "abc"),
            ("AIFT_HEALTH_INTERVAL_S", "11"),
            ("AIFT_HEALTH_TIMEOUT_S", "0"),
            ("AIFT_HEALTH_TIMEOUT_S", "31"),
            ("AIFT_HEALTH_ATTEMPTS", "3; id"),
        ):
            with self.subTest(name=name, value=value):
                result = self.run_remote(sha2, **{name: value})
                self.assertEqual(result.returncode, 1)
                self.assertEqual(self.head(), before)

    def test_compose_publishes_the_dashboard_on_loopback_only(self):
        compose = read(ROOT / "apps/aift-dashboard/compose.yml")
        self.assertIn('"127.0.0.1:3000:3000"', compose)
        remote = read(REMOTE_SCRIPT)
        self.assertIn('HEALTH_URL="http://127.0.0.1:3000/api/health"', remote)
        self.assertNotRegex(remote, r"curl[^\n]*(0\.0\.0\.0|https?://[a-z]+\.[a-z])")


class ScriptSyntaxAndDocsTests(unittest.TestCase):
    def test_scripts_are_valid_bash(self):
        for script in (REMOTE_SCRIPT, RUNNER_SCRIPT):
            result = subprocess.run(["bash", "-n", str(script)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_secrets_doc_covers_gate_environment_secrets_and_known_hosts_format(self):
        doc = read(SECRETS_DOC)
        for needle in (
            "VPS_DEPLOY_ENABLED",
            "production",
            "Required reviewers",
            "VPS_APP_PATH",
            "/root/AIFT/VPS",
            "VPS_KNOWN_HOSTS",
            "[host]:port keytype key",
            "ssh-keyscan -p <port> -t ed25519 <host>",
            "docs/deploy-rollback.md",
        ):
            self.assertIn(needle, doc)

    def test_rollback_doc_covers_every_procedure(self):
        doc = read(ROLLBACK_DOC)
        for needle in (
            "rollback_sha",
            "previous_sha",
            "deployments.jsonl",
            "git checkout --detach",
            "ancestor",
            "VPS_DEPLOY_ENABLED",
            "docker compose",
            "/api/health",
        ):
            self.assertIn(needle, doc)

    def test_preflight_script_does_not_hardcode_root_vps_default(self):
        source = read(ROOT / "scripts/aift-dashboard-security-preflight.py")
        self.assertNotIn('default=Path("/root/VPS")', source)
        self.assertIn("def default_repo_path", source)


if __name__ == "__main__":
    unittest.main()
