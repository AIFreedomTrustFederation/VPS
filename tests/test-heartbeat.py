#!/usr/bin/env python3
"""Regression checks for local node heartbeat metadata serialization."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(os.environ.get('AIFT_HEARTBEAT_SCRIPT', 'scripts/aift-heartbeat.sh')).resolve()


class HeartbeatTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='aift-heartbeat-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.home = self.root / 'node home'
        self.bin_dir = self.root / 'bin'
        self.bin_dir.mkdir()
        self.curl = self.bin_dir / 'curl'
        self.curl.write_text('#!/bin/sh\nexit 0\n', encoding='utf-8')
        self.curl.chmod(0o755)

    def run_heartbeat(self, **overrides):
        env = os.environ.copy()
        env.update({
            'AIFT_HOME': str(self.home),
            'NODE_NAME': 'test-node',
            'NODE_DISPLAY': 'Test Node',
            'NODE_CLASS': 'phone-experimental',
            'APP_PORT': '3000',
            'PATH': f'{self.bin_dir}{os.pathsep}{os.environ.get("PATH", "")}',
        })
        env.update(overrides)
        return subprocess.run(['bash', str(SCRIPT)], env=env, capture_output=True, text=True)

    def test_quotes_newlines_and_unicode_are_valid_json(self):
        display = 'Demo "quoted" \\ backslash\nSecond line ☀'
        node_class = 'edge "experimental"\nnode'
        result = self.run_heartbeat(NODE_DISPLAY=display, NODE_CLASS=node_class)
        self.assertEqual(result.returncode, 0, result.stderr)
        expected = self.home / 'heartbeats' / 'test-node.json'
        self.assertEqual(json.loads(result.stdout), json.loads(expected.read_text()))
        payload = json.loads(result.stdout)
        self.assertEqual(payload['display_name'], display)
        self.assertEqual(payload['node_class'], node_class)
        self.assertEqual(payload['port'], 3000)
        self.assertEqual(payload['status'], 'online')

    def test_unhealthy_endpoint_reports_warning(self):
        self.curl.write_text('#!/bin/sh\nexit 22\n', encoding='utf-8')
        result = self.run_heartbeat()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'], 'warning')

    def test_traversal_node_name_fails_before_writing(self):
        result = self.run_heartbeat(NODE_NAME='../escape')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Invalid NODE_NAME', result.stderr)
        self.assertFalse(self.home.exists())
        self.assertFalse((self.root / 'escape.json').exists())

    def test_noncanonical_or_out_of_range_ports_fail_before_writing(self):
        for port in ('0', '65536', '03000', '3000, "status": "online"', 'abc'):
            with self.subTest(port=port):
                result = self.run_heartbeat(APP_PORT=port)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Invalid APP_PORT', result.stderr)
                self.assertFalse(self.home.exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
