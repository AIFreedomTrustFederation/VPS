#!/usr/bin/env python3
"""Exercise evidence generation using real temporary Git repos and commands."""

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time
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

    @unittest.skipUnless(sys.platform.startswith("linux"), "Linux process-group cleanup")
    def test_timed_out_check_kills_descendant_process(self):
        # subprocess.run(timeout=...) kills only its immediate child. A
        # grandchild could otherwise modify files after verification ends.
        marker = self.base / "late-descendant"
        ready = self.base / "descendant-spawned"
        grandchild = ("import time; from pathlib import Path; "
                      f"time.sleep(3); Path({str(marker)!r}).write_text('escaped')")
        parent = ("import subprocess, sys, time; from pathlib import Path; "
                  f"subprocess.Popen([sys.executable, '-B', '-c', {grandchild!r}]); "
                  f"Path({str(ready)!r}).write_text('spawned'); time.sleep(30)")
        with patch.object(evidence, "CHECK_TIMEOUT", 2):
            check = evidence.run_check(
                "descendant_timeout", [sys.executable, "-B", "-c", parent], self.root)
        self.assertTrue(ready.exists(), "fixture failed to start its descendant")
        self.assertEqual(check["exit_code"], 124)
        self.assertEqual(check["status"], "failed")
        time.sleep(3.5)
        self.assertFalse(marker.exists(), "timed-out check left a live descendant")

    @unittest.skipUnless(sys.platform.startswith("linux"), "Linux process-group cleanup")
    def test_successful_check_kills_lingering_descendant(self):
        # A parent can exit successfully while a background child continues
        # modifying files after the clean-checkout assertion and publication.
        marker = self.base / "late-success-descendant"
        ready = self.base / "success-descendant-spawned"
        grandchild = ("import time; from pathlib import Path; "
                      f"time.sleep(1); Path({str(marker)!r}).write_text('escaped')")
        parent = ("import subprocess, sys; from pathlib import Path; "
                  f"subprocess.Popen([sys.executable, '-B', '-c', {grandchild!r}]); "
                  f"Path({str(ready)!r}).write_text('spawned')")
        check = evidence.run_check(
            "success_descendant", [sys.executable, "-B", "-c", parent], self.root)
        self.assertTrue(ready.exists(), "fixture failed to start its descendant")
        self.assertEqual(check["exit_code"], 0)
        self.assertEqual(check["status"], "passed")
        time.sleep(2)
        self.assertFalse(marker.exists(), "successful check left a live descendant")

    @unittest.skipUnless(sys.platform.startswith("linux"), "Linux process-group cleanup")
    def test_failed_check_kills_lingering_descendant(self):
        # A nonzero parent exit is not a timeout, but its background child
        # must still be contained before failure evidence is published.
        marker = self.base / "late-failed-descendant"
        ready = self.base / "failed-descendant-spawned"
        grandchild = ("import time; from pathlib import Path; "
                      f"time.sleep(1); Path({str(marker)!r}).write_text('escaped')")
        parent = ("import subprocess, sys; from pathlib import Path; "
                  f"subprocess.Popen([sys.executable, '-B', '-c', {grandchild!r}]); "
                  f"Path({str(ready)!r}).write_text('spawned'); sys.exit(9)")
        check = evidence.run_check(
            "failed_descendant", [sys.executable, "-B", "-c", parent], self.root)
        self.assertTrue(ready.exists(), "fixture failed to start its descendant")
        self.assertEqual(check["exit_code"], 9)
        self.assertEqual(check["status"], "failed")
        time.sleep(2)
        self.assertFalse(marker.exists(), "failed check left a live descendant")

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
                  r['overall_status'] != 'passed' for r in records) or
              any(r.get('dependencies', {}).get('status') == 'failed' for r in records) or
              any(r.get('deployment', {}).get('status') == 'failed' for r in records) or
              any(r.get('security', {}).get('status') == 'failed' for r in records))
except (ValueError, KeyError, TypeError):
    failed = True
    records = []
print(json.dumps({'schema':'aift.federation-assessment.v1',
                  'status':'failed' if failed else 'partial',
                  'provenance':'unsigned_supplied_json_not_authenticated',
                  'repositories':[{'repository':r['repository'],
                                   'commit_sha':r['commit_sha'],
                                   'status':('failed' if r['overall_status'] != 'passed' or
                                             any(r[g]['status'] == 'failed' for g in ('security','dependencies','deployment'))
                                             else 'reported_checks_passed_with_gaps'),
                                   'check_count':len(r['checks']),
                                   'unverified_gates':[f"{g}:{r[g]['status']}" for g in ('security','dependencies','deployment') if r[g]['status'] in ('not_checked','not_applicable')],
                                   'failed_gates':[g for g in ('security','dependencies','deployment') if r[g]['status']=='failed']} for r in records]}))
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
                        "checks": [{"id": "check", "status": "passed", "exit_code": 0}],
                        "security": {"status": "not_checked"},
                        "dependencies": {"status": "not_checked"},
                        "deployment": {"status": "not_applicable"}}

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



    def test_bridge_rejects_partial_report_omitting_expected_repository(self):
        # A consumer that drops Runtime but reports "partial" must not turn
        # this cross-repository integration check green.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "omitting_consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"

            def record(repo):
                return {"repository": repo, "commit_sha": sha,
                        "overall_status": "passed",
                        "checks": [{"id": "check", "status": "passed", "exit_code": 0}],
                        "security": {"status": "not_checked"},
                        "dependencies": {"status": "not_checked"},
                        "deployment": {"status": "not_applicable"}}

            vps.write_text(json.dumps(record("AIFreedomTrustFederation/VPS")))
            runtime.write_text(json.dumps(record("AIFreedomTrustFederation/AIFT-Runtime")))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]

            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            omitted = STRICT_BRIDGE_CONSUMER.replace(
                "for r in records]}))", "for r in records[:1]]}))"
            )
            self.assertNotEqual(omitted, STRICT_BRIDGE_CONSUMER)
            consumer.write_text(omitted)
            invalid = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
            self.assertIn("Consumer positive report omitted", invalid.stderr)



    def test_bridge_rejects_consumer_omitting_executed_check_counts(self):
        # A consumer that silently reports zero checks must not make a
        # two-repository integration result look successful.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            inaccurate = STRICT_BRIDGE_CONSUMER.replace(
                "'check_count':len(r['checks'])", "'check_count':0")
            self.assertNotEqual(inaccurate, STRICT_BRIDGE_CONSUMER)
            consumer.write_text(inaccurate)
            invalid = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
            self.assertIn("Consumer must preserve executed check counts", invalid.stderr)


    def test_bridge_requires_runtime_stale_and_failed_rejection(self):
        # The integration must fail if a consumer validates VPS correctly but
        # silently trusts Runtime's commit or check status.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"

            def record(repo):
                return {"repository": repo, "commit_sha": sha,
                        "overall_status": "passed",
                        "checks": [{"id": "check", "status": "passed", "exit_code": 0}],
                        "security": {"status": "not_checked"},
                        "dependencies": {"status": "not_checked"},
                        "deployment": {"status": "not_applicable"}}

            vps.write_text(json.dumps(record("AIFreedomTrustFederation/VPS")))
            runtime.write_text(json.dumps(record("AIFreedomTrustFederation/AIFT-Runtime")))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            original = ("any(r['commit_sha'] != expected.get(r['repository']) or\n"
                        "                  r['overall_status'] != 'passed' for r in records)")
            self.assertIn(original, STRICT_BRIDGE_CONSUMER)
            variants = {
                "ignore_runtime_sha": (
                    "any((r['commit_sha'] != expected.get(r['repository']) and\n"
                    "                  r['repository'] == 'AIFreedomTrustFederation/VPS') or\n"
                    "                  r['overall_status'] != 'passed' for r in records)"),
                "ignore_runtime_failure": (
                    "any(r['commit_sha'] != expected.get(r['repository']) or\n"
                    "                  (r['overall_status'] != 'passed' and\n"
                    "                   r['repository'] == 'AIFreedomTrustFederation/VPS') for r in records)"),
            }
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)
            for scenario, replacement in variants.items():
                with self.subTest(scenario=scenario):
                    consumer.write_text(STRICT_BRIDGE_CONSUMER.replace(original, replacement))
                    invalid = subprocess.run(command, capture_output=True, text=True)
                    self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
                    self.assertIn("Consumer exited 0, expected 1", invalid.stderr)


    def test_bridge_rejects_consumer_ignoring_any_failed_gate(self):
        # The bridge must reject consumers that silently ignore any of the
        # three independent evidence gates for either producer.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            gate_guards = {
                "dependencies": ("any(r.get('dependencies', {}).get('status') "
                                 "== 'failed' for r in records) or\n              "),
                "deployment": ("any(r.get('deployment', {}).get('status') "
                               "== 'failed' for r in records) or\n              "),
                "security": (" or\n              any(r.get('security', {}).get('status') "
                             "== 'failed' for r in records)"),
            }
            for gate, guard in gate_guards.items():
                with self.subTest(gate=gate):
                    self.assertIn(guard, STRICT_BRIDGE_CONSUMER)
                    consumer.write_text(STRICT_BRIDGE_CONSUMER.replace(guard, ""))
                    invalid = subprocess.run(command, capture_output=True, text=True)
                    self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
                    self.assertIn("Consumer exited 0, expected 1", invalid.stderr)


    def test_bridge_rejects_duplicate_consumer_assessment_keys(self):
        # Python's default JSON parser accepts duplicate keys and keeps the
        # last value. An ambiguous assessment must not pass the bridge.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            # Prefix a conflicting schema key, leaving the valid schema last.
            # Without strict duplicate detection, json.loads silently accepts
            # the later schema and all other bridge assertions still pass.
            start = "print(json.dumps({'schema':'aift.federation-assessment.v1',"
            end = "for r in records]}))"
            self.assertIn(start, STRICT_BRIDGE_CONSUMER)
            self.assertIn(end, STRICT_BRIDGE_CONSUMER)
            ambiguous = STRICT_BRIDGE_CONSUMER.replace(
                start,
                "print('{\\\"schema\\\":\\\"aift.federation-assessment.v0\\\",' + json.dumps({'schema':'aift.federation-assessment.v1',",
                1,
            ).replace(end, "for r in records]})[1:])", 1)
            consumer.write_text(ambiguous)
            invalid = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
            self.assertIn("Consumer assessment contains duplicate JSON key: schema",
                          invalid.stderr)


    def test_bridge_requires_assessment_schema_for_both_producers(self):
        # A consumer can return a plausible partial assessment while omitting
        # its machine-readable schema, which breaks downstream compatibility.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            schema_field = "'schema':'aift.federation-assessment.v1',"
            self.assertIn(schema_field, STRICT_BRIDGE_CONSUMER)
            for variant, replacement in (
                ("missing", ""),
                ("wrong_version", "'schema':'aift.federation-assessment.v0',"),
            ):
                with self.subTest(variant=variant):
                    consumer.write_text(STRICT_BRIDGE_CONSUMER.replace(
                        schema_field, replacement))
                    invalid = subprocess.run(command, capture_output=True, text=True)
                    self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
                    self.assertIn("Consumer assessment schema mismatch", invalid.stderr)


    def test_bridge_rejects_consumer_dropping_one_unverified_gate(self):
        # A gate-blind consumer could report only two of three unchecked
        # gates, still say "partial", and previously pass the integration.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            marker = "('security','dependencies','deployment')"
            self.assertIn(marker, STRICT_BRIDGE_CONSUMER)
            consumer.write_text(STRICT_BRIDGE_CONSUMER.replace(
                marker, "('security','deployment')"))
            invalid = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
            self.assertIn("Consumer must preserve executed check counts and unchecked gates",
                          invalid.stderr)


    def test_bridge_rejects_failed_gate_without_gate_attribution(self):
        # A consumer can return failed for a negative gate while omitting the
        # specific failed_gates entry. That is not a complete gate assessment.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            marker = "'failed_gates':[g for g in ('security','dependencies','deployment') if r[g]['status']=='failed']"
            self.assertIn(marker, STRICT_BRIDGE_CONSUMER)
            consumer.write_text(STRICT_BRIDGE_CONSUMER.replace(marker, "'failed_gates':[]"))
            invalid = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
            self.assertIn("Consumer negative gate attribution mismatch", invalid.stderr)


    def test_bridge_rejects_false_authenticated_provenance_on_failure(self):
        # A consumer may preserve unsigned provenance for successful inputs
        # yet claim authenticated provenance for rejected inputs. The bridge
        # must check the provenance contract on every invocation.
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            consumer = base / "consumer.py"
            sha = "a" * 40
            vps = base / "vps.json"
            runtime = base / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge), "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            marker = "'provenance':'unsigned_supplied_json_not_authenticated',"
            self.assertIn(marker, STRICT_BRIDGE_CONSUMER)
            mutated = STRICT_BRIDGE_CONSUMER.replace(
                marker,
                "'provenance':('verified_signed_attestation' if failed "
                "else 'unsigned_supplied_json_not_authenticated'),")
            consumer.write_text(mutated)
            invalid = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
            self.assertIn("Consumer assessment provenance mismatch", invalid.stderr)



class BridgeStrictJsonTests(unittest.TestCase):
    def test_bridge_rejects_nonfinite_consumer_assessment(self):
        # json.loads accepts NaN and Infinity by default, including values
        # unrelated to status. The bridge must reject ambiguous JSON bytes.
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            consumer = root / "consumer.py"
            sha = "a" * 40
            vps = root / "vps.json"
            runtime = root / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge),
                       "--consumer", str(consumer), "--vps-record", str(vps),
                       "--runtime-record", str(runtime), "--vps-sha", sha,
                       "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            valid = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(valid.returncode, 0, valid.stderr)

            marker = "'schema':'aift.federation-assessment.v1',"
            self.assertIn(marker, STRICT_BRIDGE_CONSUMER)
            for literal, expression in (("NaN", "float('nan')"),
                                        ("Infinity", "float('inf')"),
                                        ("-Infinity", "float('-inf')")):
                with self.subTest(literal=literal):
                    mutated = STRICT_BRIDGE_CONSUMER.replace(
                        marker, marker + "'unused':" + expression + ",", 1)
                    consumer.write_text(mutated)
                    invalid = subprocess.run(command, capture_output=True, text=True)
                    self.assertNotEqual(invalid.returncode, 0, invalid.stdout)
                    self.assertIn("Consumer assessment contains non-finite number",
                                  invalid.stderr)

            # Python also decodes 1e9999 to infinity even without a NaN
            # constant. Exercise the bridge's exponent-overflow guard.
            bridge_spec = importlib.util.spec_from_file_location("strict_bridge", bridge)
            bridge_module = importlib.util.module_from_spec(bridge_spec)
            bridge_spec.loader.exec_module(bridge_module)
            with self.assertRaisesRegex(RuntimeError, "non-finite number"):
                bridge_module.finite_assessment_float("1e9999")
            self.assertEqual(bridge_module.finite_assessment_float("1.25"), 1.25)


    def test_bridge_rejects_excessive_consumer_assessment_depth_and_size(self):
        # Consumer JSON is not trusted merely because the process exited 0.
        # Deeply nested and oversized ignored fields must fail with controlled
        # errors, rather than an uncaught parser recursion or a false pass.
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            consumer = root / "consumer.py"
            sha = "a" * 40
            vps = root / "vps.json"
            runtime = root / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            bridge = Path(__file__).with_name("check-federation-evidence.py")
            command = [sys.executable, "-B", str(bridge),
                       "--consumer", str(consumer), "--vps-record", str(vps),
                       "--runtime-record", str(runtime), "--vps-sha", sha,
                       "--runtime-sha", sha]
            consumer.write_text(STRICT_BRIDGE_CONSUMER)
            baseline = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(baseline.returncode, 0, baseline.stderr)

            start = "print(json.dumps({'schema':"
            end = "for r in records]}))"
            self.assertIn(start, STRICT_BRIDGE_CONSUMER)
            self.assertIn(end, STRICT_BRIDGE_CONSUMER)
            variants = {
                "deeply_nested": ("'[' * 20000 + '0' + ']' * 20000",
                                  "Consumer assessment contains invalid or excessively nested JSON"),
                "oversized": ("'\"' + 'x' * (2 * 1024 * 1024) + '\"'",
                              "Consumer assessment exceeds 1 MiB"),
            }
            for scenario, (expression, expected_error) in variants.items():
                with self.subTest(scenario=scenario):
                    mutated = STRICT_BRIDGE_CONSUMER.replace(
                        start, "raw = json.dumps({'schema':", 1
                    ).replace(
                        end,
                        "for r in records]})\n"
                        "print(raw[:-1] + ',\"ignored\":' + " + expression + " + '}')",
                        1,
                    )
                    self.assertNotEqual(mutated, STRICT_BRIDGE_CONSUMER)
                    consumer.write_text(mutated)
                    result = subprocess.run(command, capture_output=True, text=True)
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertIn(expected_error, result.stderr)



@unittest.skipUnless(sys.platform.startswith("linux"), "POSIX consumer capture")
class BridgeBoundedCaptureTests(unittest.TestCase):
    def setUp(self):
        bridge_path = Path(__file__).with_name("check-federation-evidence.py")
        spec = importlib.util.spec_from_file_location(
            "vps_federation_bridge_bounded_capture", bridge_path)
        self.bridge = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.bridge)

    def test_oversized_stdout_aborts_before_consumer_finishes(self):
        # An untrusted consumer can emit 2 MiB and then sleep. The bridge
        # must stop it immediately rather than buffer all output or wait.
        command = [sys.executable, "-B", "-c",
                   "import sys,time; sys.stdout.write('x'*(2*1024*1024)); "
                   "sys.stdout.flush(); time.sleep(12)"]
        started = time.monotonic()
        with self.assertRaisesRegex(RuntimeError, "Consumer assessment exceeds 1 MiB"):
            self.bridge.run_consumer_bounded(command)
        self.assertLess(time.monotonic() - started, 8)

    def test_large_stderr_is_drained_but_bounded(self):
        # A noisy consumer must not deadlock on stderr or exhaust memory.
        command = [sys.executable, "-B", "-c",
                   "import sys; sys.stderr.write('z'*(2*1024*1024)); "
                   "sys.stdout.write('{}')"]
        result = self.bridge.run_consumer_bounded(command)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "{}")
        self.assertEqual(len(result.stderr.encode("utf-8")),
                         self.bridge.MAX_CONSUMER_STDERR_BYTES)


class BridgeConsumerTimeoutTests(unittest.TestCase):
    def test_hung_consumer_fails_closed_without_waiting_for_job_timeout(self):
        # Exercise a real sleeping subprocess, not a mocked return code.
        bridge_path = Path(__file__).with_name("check-federation-evidence.py")
        spec = importlib.util.spec_from_file_location("vps_federation_bridge_timeout", bridge_path)
        bridge = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(bridge)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            consumer = root / "sleeping_consumer.py"
            consumer.write_text("import time\ntime.sleep(5)\n")
            args = [str(bridge_path), "--consumer", str(consumer),
                    "--vps-record", str(root / "vps.json"),
                    "--runtime-record", str(root / "runtime.json"),
                    "--vps-sha", "a" * 40, "--runtime-sha", "b" * 40]
            with patch.object(sys, "argv", args), patch.object(
                    bridge, "CONSUMER_TIMEOUT_SECONDS", 0.1):
                with self.assertRaisesRegex(RuntimeError, r"Consumer timed out after 0\.1 seconds"):
                    bridge.main()


    def test_timed_out_consumer_kills_inherited_pipe_descendant(self):
        # subprocess.run(timeout=...) kills only the immediate child. A child
        # that spawns a writer inheriting the pipes can survive a timed-out
        # assessment and modify state after the bridge has reported failure.
        import time
        bridge_path = Path(__file__).with_name("check-federation-evidence.py")
        spec = importlib.util.spec_from_file_location("vps_federation_bridge_group", bridge_path)
        bridge = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(bridge)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            marker = root / "descendant-survived"
            spawned = root / "descendant-pid"
            consumer = root / "spawning_consumer.py"
            descendant = (
                "from pathlib import Path; import time; time.sleep(4); "
                f"Path({str(marker)!r}).write_text('survived')"
            )
            consumer.write_text(
                "import subprocess, sys, time\n"
                f"child = subprocess.Popen([sys.executable, '-c', {descendant!r}], "
                "stdout=sys.stdout, stderr=sys.stderr)\n"
                f"from pathlib import Path; Path({str(spawned)!r}).write_text(str(child.pid))\n"
                "time.sleep(15)\n"
            )
            args = [str(bridge_path), "--consumer", str(consumer),
                    "--vps-record", str(root / "vps.json"),
                    "--runtime-record", str(root / "runtime.json"),
                    "--vps-sha", "a" * 40, "--runtime-sha", "b" * 40]
            with patch.object(sys, "argv", args), patch.object(
                    bridge, "CONSUMER_TIMEOUT_SECONDS", 2):
                with self.assertRaisesRegex(RuntimeError, "Consumer timed out after 2 seconds"):
                    bridge.main()
            self.assertTrue(spawned.exists(), "Timeout fixture did not spawn a descendant")
            time.sleep(5)
            self.assertFalse(marker.exists(), "Timed-out consumer left a live descendant")



    @unittest.skipUnless(sys.platform.startswith("linux"), "Linux process-group cleanup")
    def test_successful_consumer_kills_closed_pipe_descendants(self):
        # A consumer may exit 0 and close its pipes while a background child
        # remains alive. Successful integration must not leave that child
        # free to mutate checkout or evidence after assessment.
        import time
        bridge_path = Path(__file__).with_name("check-federation-evidence.py")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            marker = root / "late-consumer-descendant"
            ready = root / "consumer-descendant-spawned"
            consumer = root / "consumer.py"
            descendant = (
                "import time; from pathlib import Path; "
                f"time.sleep(3); Path({str(marker)!r}).write_text('escaped')"
            )
            consumer.write_text(
                "import subprocess, sys\n"
                f"subprocess.Popen([sys.executable, '-B', '-c', {descendant!r}], "
                "stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, "
                "stderr=subprocess.DEVNULL)\n"
                f"from pathlib import Path; Path({str(ready)!r}).write_text('spawned')\n"
                + STRICT_BRIDGE_CONSUMER
            )
            sha = "a" * 40
            vps = root / "vps.json"
            runtime = root / "runtime.json"
            for path, repo in ((vps, "AIFreedomTrustFederation/VPS"),
                               (runtime, "AIFreedomTrustFederation/AIFT-Runtime")):
                path.write_text(json.dumps({
                    "repository": repo, "commit_sha": sha,
                    "overall_status": "passed",
                    "checks": [{"id": "source", "status": "passed", "exit_code": 0}],
                    "security": {"status": "not_checked"},
                    "dependencies": {"status": "not_checked"},
                    "deployment": {"status": "not_applicable"},
                }))
            command = [sys.executable, "-B", str(bridge_path),
                       "--consumer", str(consumer),
                       "--vps-record", str(vps), "--runtime-record", str(runtime),
                       "--vps-sha", sha, "--runtime-sha", sha]
            result = subprocess.run(command, capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(ready.exists(), "Consumer fixture did not spawn a child")
            time.sleep(3.5)
            self.assertFalse(marker.exists(), "Successful consumer left a live descendant")


if __name__ == "__main__":
    unittest.main()
