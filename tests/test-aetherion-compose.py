"""Static security-contract tests; never run Docker or modify the host."""
from pathlib import Path
import unittest

COMPOSE = Path(__file__).resolve().parents[1] / "ops/aetherion/compose.yml"


class ComposeContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = COMPOSE.read_text(encoding="utf-8")

    def test_ollama_host_port_is_loopback_only(self):
        self.assertIn('"127.0.0.1:11434:11434"', self.text)
        self.assertNotIn('"11434:11434"', self.text)

    def test_image_must_be_operator_digest_pinned(self):
        self.assertIn("ollama/ollama@${AIFT_OLLAMA_IMAGE_DIGEST:?", self.text)
        self.assertNotIn("ollama/ollama:latest", self.text)

    def test_import_is_read_only_and_has_no_credential_mounts(self):
        self.assertIn(':/aift-import:ro"', self.text)
        self.assertIn("ollama-store:/root/.ollama", self.text)
        self.assertNotIn("/var/run/docker.sock", self.text)
        self.assertNotIn(".ssh", self.text)
        self.assertNotIn("AIFT_AUTODEV_APP_PRIVATE_KEY", self.text)

    def test_resource_limits_and_security_boundaries(self):
        for phrase in ("read_only: true", "cap_drop:", "- ALL",
                       "no-new-privileges:true", "pids_limit:",
                       "OLLAMA_NO_CLOUD:", "OLLAMA_NUM_PARALLEL:"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.text)


if __name__ == "__main__":
    unittest.main()
