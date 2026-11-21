"""Offline regressions for the VPS Aetherion host probe (no Ollama required)."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "aift_aetherion_preflight", HERE / "scripts/aift-aetherion-preflight.py")
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class AetherionPreflightTests(unittest.TestCase):
    def test_local_endpoint_only(self):
        self.assertEqual(probe.loopback_port("http://127.0.0.1:11434/v1"), 11434)
        invalid = [
            "https://127.0.0.1:11434/v1", "http://localhost:11434/v1",
            "http://192.168.1.3:11434/v1", "http://[::1]:11434/v1",
            "http://user@127.0.0.1:11434/v1", "http://127.0.0.1:0/v1",
            "http://127.0.0.1:bad/v1", "http://127.0.0.1:11434/v1?x=y",
            "http://127.0.0.1:11434/v1#fragment",
            "http://127.0.0.1:11434/api/generate",
        ]
        for item in invalid:
            with self.subTest(item=item), self.assertRaises(probe.ProbeError):
                probe.loopback_port(item)

    def test_exact_model_name_registration(self):
        body = {"data": [{"id": "aetherion:latest"}, {"id": "other"}]}
        self.assertTrue(probe.registered_model(body, "aetherion:latest"))
        self.assertFalse(probe.registered_model(body, "aetherion"))
        self.assertFalse(probe.registered_model({}, "aetherion:latest"))
        self.assertFalse(probe.registered_model({"data": ["aetherion:latest"]},
                                                 "aetherion:latest"))

    def test_registrations_do_not_claim_inference_or_runner(self):
        with patch.object(probe, "request_json", return_value={
            "data": [{"id": "aetherion:latest"}]}):
            report, rc = probe.check("http://127.0.0.1:11434/v1",
                                     "aetherion:latest", False, 5)
        self.assertEqual(rc, 0)
        self.assertEqual(report["status"], "model_registration_observed")
        self.assertEqual(report["checks"]["structured_inference"], "not_requested")
        self.assertEqual(report["runner_registration"], "not_checked")
        self.assertEqual(report["production_deployment"], "not_checked")

    def test_structured_probe_accepts_only_correct_edit(self):
        good = {"choices": [{"finish_reason": "stop", "message": {
            "content": '{"old":"local checks","new":"local verification","summary":"Clearer terminology"}'
        }}]}
        with patch.object(probe, "request_json", return_value=good) as req:
            self.assertTrue(probe.structured_inference(11434, "aetherion:latest", 5))
        packet = req.call_args.args[3]
        self.assertEqual(packet["model"], "aetherion:latest")
        self.assertEqual(packet["response_format"]["type"], "json_schema")
        self.assertEqual(packet["response_format"]["json_schema"]["schema"], probe.SCHEMA)
        self.assertEqual(req.call_args.args[:3], (11434, "POST", "/v1/chat/completions"))
        self.assertIn("CURRENT MARKDOWN:", packet["messages"][1]["content"])
        self.assertIn(probe.SAMPLE_ORIGINAL, packet["messages"][1]["content"])
        self.assertIn(probe.SAMPLE_INSTRUCTION, packet["messages"][1]["content"])
        self.assertIn("exactly once", packet["messages"][0]["content"])
        self.assertEqual(packet["max_tokens"], 3500)

    def test_exact_whole_line_replacement_is_equivalent(self):
        self.assertEqual(probe.apply_sample_replacement({
            "old": "AIFT performs local checks.",
            "new": "AIFT performs local verification.",
            "summary": "One complete line replaced",
        }), probe.SAMPLE_EXPECTED)

    def test_sample_replacement_rejects_wrong_content_or_multiple_spans(self):
        invalid = [
            {"old": "local checks", "new": "local check", "summary": "x"},
            {"old": "missing", "new": "new", "summary": "x"},
            {"old": "local checks", "new": "local checks", "summary": "x"},
            {"old": "local checks", "new": "local verification\nextra", "summary": "x"},
            {"old": "local checks", "new": "local verification", "summary": "x",
             "added": "other material"},
            {"old": "", "new": "local verification", "summary": "x"},
            {"old": "local checks", "new": "local verification", "summary": ""},
        ]
        for proposed in invalid:
            with self.subTest(proposed=proposed), self.assertRaises(probe.ProbeError):
                probe.apply_sample_replacement(proposed)

    def test_structured_probe_fails_for_invalid_or_extra_edit(self):
        invalid = [
            {"choices": [{"finish_reason": "length", "message": {
                "content": '{"old":"local checks","new":"local verification","summary":"x"}'}}]},
            {"choices": [{"message": {"content": "Not JSON"}}]},
            {"choices": [{"message": {"content": (
                '{"old":"local checks","new":"local verification",'
                '"summary":"x","content":"unauthorized"}')}}]},
            {"choices": [{"message": {"content": (
                '{"old":"local checks","new":"unrelated",'
                '"summary":"x"}')}}]},
        ]
        for body in invalid:
            with self.subTest(body=body), patch.object(
                    probe, "request_json", return_value=body):
                with self.assertRaises(probe.ProbeError):
                    probe.structured_inference(11434, "aetherion:latest", 5)

    def test_inference_not_claimed_when_endpoint_unavailable(self):
        with patch.object(probe, "request_json", side_effect=probe.ProbeError(
                "local_endpoint_unavailable")):
            report, rc = probe.check("http://127.0.0.1:11434/v1",
                                     "aetherion:latest", True, 5)
        self.assertEqual(rc, 1)
        self.assertEqual(report["status"], "blocked")
        self.assertEqual(report["checks"]["model_registered"],
                         "local_endpoint_unavailable")

    def test_inference_verified_still_does_not_claim_host_deployment(self):
        with patch.object(probe, "request_json", return_value={
                "data": [{"id": "aetherion:latest"}]}), patch.object(
                probe, "structured_inference", return_value=True):
            report, rc = probe.check("http://127.0.0.1:11434/v1",
                                     "aetherion:latest", True, 5)
        self.assertEqual(rc, 0)
        self.assertEqual(report["status"], "local_inference_verified")
        self.assertEqual(report["runner_registration"], "not_checked")

    def test_hostile_model_name_blocks_without_network(self):
        with patch.object(probe, "request_json") as req:
            report, rc = probe.check("http://127.0.0.1:11434/v1",
                                     "model\nAuthorization: token", True, 5)
        self.assertEqual(rc, 1)
        req.assert_not_called()
        self.assertEqual(report["status"], "blocked")


if __name__ == "__main__":
    unittest.main()
