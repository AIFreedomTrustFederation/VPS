"""Isolated real-Git tests for dashboard blue/green promotion safety.

No production route, external remote, npm install, or dashboard build is used.
"""
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "aift-bluegreen-sync.sh"


def run(*args, cwd=None, env=None):
    return subprocess.run(args, cwd=cwd, env=env, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                          timeout=25, check=False)


def executable(path, body):
    path.write_text(body, encoding="utf-8")
    path.chmod(0o755)


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/api/health":
            self.send_error(404)
            return
        body = b'{"ok":true,"status":"healthy"}'
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


class BlueGreenSyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="aift-bluegreen-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.node = self.root / "node"
        self.remote = self.root / "remote.git"
        self.home = self.root / "state"
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.node.mkdir()
        for command in [("git", "init", "-b", "main"),
                        ("git", "config", "user.email", "test@example.invalid"),
                        ("git", "config", "user.name", "AIFT Test")]:
            result = run(*command, cwd=self.node)
            self.assertEqual(result.returncode, 0, result.stdout)
        app = self.node / "apps" / "aift-dashboard"
        app.mkdir(parents=True)
        (app / "package.json").write_text('{"name":"test-dashboard"}\n')
        for command in [("git", "add", "."), ("git", "commit", "-m", "fixture")]:
            result = run(*command, cwd=self.node)
            self.assertEqual(result.returncode, 0, result.stdout)
        result = run("git", "init", "--bare", "-b", "main", str(self.remote))
        self.assertEqual(result.returncode, 0, result.stdout)
        for command in [("git", "remote", "add", "origin", str(self.remote)),
                        ("git", "push", "-u", "origin", "main")]:
            result = run(*command, cwd=self.node)
            self.assertEqual(result.returncode, 0, result.stdout)

        executable(self.bin / "npm", "#!/bin/sh\nexit 0\n")
        self.active = self.home / "runtime" / "dashboard-active.json"
        self.active.parent.mkdir(parents=True)
        self.previous = '{"target_port":3101,"commit":"previous"}\n'
        self.active.write_text(self.previous)
        self.port = self.free_port()
        self.env = dict(os.environ,
                        AIFT_NODE_DIR=str(self.node),
                        AIFT_HOME=str(self.home),
                        AIFT_CANDIDATE_DASHBOARD_PORT=str(self.port),
                        AIFT_PUBLIC_DASHBOARD_PORT="3001",
                        PATH=f'{self.bin}{os.pathsep}{os.environ["PATH"]}')
        self.addCleanup(self.stop_candidate)

    @staticmethod
    def free_port():
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            return sock.getsockname()[1]

    def stop_candidate(self):
        pid_file = self.home / "runtime" / "dashboard-candidate.pid"
        if pid_file.exists():
            try:
                os.kill(int(pid_file.read_text().strip()), signal.SIGTERM)
            except (ValueError, ProcessLookupError, PermissionError):
                pass

    def invoke(self):
        return run("bash", str(SCRIPT), cwd=self.node, env=self.env)

    def test_occupied_candidate_port_cannot_be_promoted(self):
        """An unrelated healthy server must not be mistaken for our candidate."""
        executable(self.bin / "npx", "#!/bin/sh\nexit 0\n")
        server = ThreadingHTTPServer(("127.0.0.1", self.port), HealthHandler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            result = self.invoke()
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertEqual(self.active.read_text(), self.previous)
            self.assertNotIn("GREEN Blue/green sync complete.", result.stdout)
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=5)

    def test_exited_candidate_cannot_pass_spurious_health(self):
        """Even a 200-like curl result cannot promote a dead candidate PID."""
        executable(self.bin / "npx", "#!/bin/sh\nexit 0\n")
        executable(self.bin / "curl", "#!/bin/sh\nsleep 0.3\nexit 0\n")
        result = self.invoke()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(self.active.read_text(), self.previous)
        self.assertNotIn("GREEN Blue/green sync complete.", result.stdout)

    def test_live_candidate_still_promotes(self):
        """Existing successful blue/green promotion remains supported."""
        server_code = '''#!/usr/bin/env python3
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/api/health":
            self.send_error(404)
            return
        body = b'{"ok":true,"status":"healthy"}'
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args):
        pass
HTTPServer(("127.0.0.1", int(sys.argv[sys.argv.index("--port") + 1])), Handler).serve_forever()
'''
        executable(self.bin / "npx", server_code)
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stdout)
        active = json.loads(self.active.read_text())
        self.assertEqual(active["target_port"], self.port)
        self.assertNotEqual(active["commit"], "previous")
        self.assertIn("GREEN Blue/green sync complete.", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
