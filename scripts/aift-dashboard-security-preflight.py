#!/usr/bin/env python3
"""Operator-run, secret-redacted VPS security preflight for PR #23.
No deployment, restart, firewall change, proxy installation or Git merge.
Run as the existing deploy user on the actual VPS checkout, not on a CI runner.
"""
import argparse
import http.client
import json
import os
from pathlib import Path
import re
import secrets
import socket
import ssl
import stat
import subprocess
import tempfile
import unittest
from http.cookies import SimpleCookie
from urllib.parse import urlsplit

TOKEN = "AIFT_DASHBOARD_TOKEN"
FLAG = "AIFT_ENABLE_LOCAL_EXEC_ROUTES"
TOKEN_RE = re.compile(r"[0-9a-fA-F]{64}\Z")
ENTRY = re.compile(r"^\s*(?:export\s+)?AIFT_DASHBOARD_TOKEN\s*=(.*)$")
ENABLED = {"1", "true", "yes", "on"}
PROBE = "/api/__aift_nonexistent_security_probe__"


def command(args, cwd=None):
    return subprocess.run(args, cwd=cwd, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30).stdout


def strong(value):
    return bool(TOKEN_RE.fullmatch(value or "")) and len(set(value.lower())) > 4


def read_env(path):
    if path.is_symlink():
        raise ValueError("refusing symlink")
    if not path.exists():
        return ""
    meta = path.stat()
    if not stat.S_ISREG(meta.st_mode) or meta.st_uid != os.getuid() or meta.st_nlink != 1:
        raise ValueError("unsafe env file owner or type")
    if stat.S_IMODE(meta.st_mode) & 0o077:
        raise ValueError("env file must be private (chmod 600, after checking ownership)")
    return path.read_text(encoding="utf-8")


def token_entry(text):
    matches = [(i, ENTRY.match(line).group(1).strip())
               for i, line in enumerate(text.splitlines()) if ENTRY.match(line)]
    if len(matches) > 1:
        raise ValueError("duplicate token entries")
    if not matches:
        return None, ""
    i, value = matches[0]
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        value = value[1:-1]
    return i, value


def create_private_env(path, content):
    # O_EXCL guarantees no clobber without depending on hardlink behavior under
    # PRoot. A write failure leaves a private file for explicit operator review.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())


def provision(path):
    existed = path.exists()
    text = read_env(path)
    index, value = token_entry(text)
    if value:
        if not strong(value):
            raise ValueError("existing token is not a verified random-hex format; review or rotate manually")
        return "existing-token-preserved"
    lines = text.splitlines(keepends=True)
    entry = TOKEN + "=" + secrets.token_hex(32) + "\n"
    if index is None:
        if lines and not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        lines.append(entry)
    else:
        lines[index] = entry
    content = "".join(lines)
    if not existed:
        create_private_env(path, content)
    else:
        # Preserve atomic replacement for an existing, validated private file.
        fd, temp = tempfile.mkstemp(prefix=".env.aift-", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
            if not path.exists() or read_env(path) != text:
                raise ValueError("env file changed concurrently")
            os.replace(temp, path)
        finally:
            if os.path.exists(temp):
                os.unlink(temp)
    # Do not report success unless the final file satisfies the original
    # ownership, link-count, regular-file and permission requirements.
    if read_env(path) != content:
        raise ValueError("created env file failed verification")
    return "generated-private-token"

def inspect_runtime(dashboard):
    config = json.loads(command(["docker", "compose", "-f", "compose.yml", "config", "--format", "json"], dashboard))
    service = config["services"]["aift-dashboard"]
    env = service.get("environment", {})
    ports = service.get("ports", [])
    configured = strong(env.get(TOKEN))
    flag_off = env.get("NODE_ENV") == "production" and str(env.get(FLAG, "")).lower().strip() not in ENABLED
    loopback = bool(ports) and all(str(p.get("host_ip")) == "127.0.0.1" and str(p.get("published")) == "3000" and str(p.get("target")) == "3000" for p in ports)
    return configured, flag_off, loopback


def live_container():
    obj = json.loads(command(["docker", "inspect", "aift-dashboard"]))[0]
    env = dict(x.split("=", 1) for x in obj["Config"].get("Env", []) if "=" in x)
    bindings = obj["NetworkSettings"].get("Ports") or {}
    ports = bindings.get("3000/tcp") or []
    loopback = bool(ports) and all(p.get("HostIp") == "127.0.0.1" and p.get("HostPort") == "3000" for p in ports)
    loopback = loopback and all(not v for k, v in bindings.items() if k != "3000/tcp")
    off = env.get("NODE_ENV") == "production" and env.get(FLAG, "").strip().lower() not in ENABLED
    return obj["State"]["Running"], env.get(TOKEN, ""), off, loopback


def request_local(path, method="GET", headers=None, body=None):
    conn = http.client.HTTPConnection("127.0.0.1", 3000, timeout=5)
    try:
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse()
        return response.status, response.getheader("Set-Cookie", "")
    finally:
        conn.close()


def verify_local(token, domain):
    # Only non-existent route probes and the login endpoint. No deploy/build/install calls.
    unauth = request_local(PROBE, "POST")[0] == 401
    invalid = request_local(PROBE, "POST", {"Authorization": "Bearer invalid-aift-probe"})[0] == 401
    authorized = request_local(PROBE, "POST", {"Authorization": "Bearer " + token})[0] in (404, 405)
    wrong_login = request_local("/api/session", "POST", {"Content-Type": "application/json"},
                                json.dumps({"token": "invalid-aift-probe"}))[0] == 401
    status, header = request_local("/api/session", "POST", {
        "Content-Type": "application/json", "Host": domain, "X-Forwarded-Proto": "https"
    }, json.dumps({"token": token}))
    cookie = SimpleCookie()
    cookie.load(header)
    session = cookie.get("aift_dashboard_session")
    attrs = bool(status == 200 and session and session["httponly"] and session["secure"]
                 and session["samesite"].lower() == "strict" and session.value != token)
    same = cross = False
    if attrs:
        headers = {"Cookie": "aift_dashboard_session=" + session.value, "Host": domain,
                   "Origin": "https://" + domain, "X-Forwarded-Proto": "https"}
        same = request_local(PROBE, "POST", headers)[0] in (404, 405)
        headers["Origin"] = "https://invalid.example"
        cross = request_local(PROBE, "POST", headers)[0] == 403
    return {"unauthenticated_mutation_rejected": unauth, "invalid_bearer_rejected": invalid,
            "valid_bearer_accepted": authorized, "invalid_login_rejected": wrong_login,
            "secure_cookie_attributes_simulated_proxy": attrs,
            "same_origin_session_accepted": same, "cross_origin_session_rejected": cross}


def check_https(domain):
    socket.getaddrinfo(domain, 443, type=socket.SOCK_STREAM)
    conn = http.client.HTTPSConnection(domain, 443, context=ssl.create_default_context(), timeout=8)
    try:
        conn.request("GET", "/api/health")
        return conn.getresponse().status == 200
    finally:
        conn.close()


class SelfTests(unittest.TestCase):
    def test_create_preserve(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / ".env"
            self.assertEqual(provision(p), "generated-private-token")
            original = p.read_text()
            self.assertTrue(strong(token_entry(original)[1]))
            self.assertEqual(stat.S_IMODE(p.stat().st_mode), 0o600)
            self.assertEqual(p.stat().st_nlink, 1)
            self.assertEqual(p.stat().st_uid, os.getuid())
            self.assertEqual(provision(p), "existing-token-preserved")
            self.assertEqual(p.read_text(), original)

    def test_exclusive_create_never_overwrites(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / ".env"
            create_private_env(p, "original\n")
            with self.assertRaises(FileExistsError):
                create_private_env(p, "replacement\n")
            self.assertEqual(read_env(p), "original\n")

    def test_preserve_other_entries(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / ".env"
            p.write_text("OTHER=value\nAIFT_DASHBOARD_TOKEN=\"\"\nLAST=value")
            p.chmod(0o600)
            provision(p)
            self.assertIn("OTHER=value\n", p.read_text())
            self.assertTrue(p.read_text().endswith("LAST=value"))
            self.assertTrue(strong(token_entry(p.read_text())[1]))

    def test_reject_duplicates_weak_and_symlinks(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / ".env"
            for content in ("AIFT_DASHBOARD_TOKEN=abc\n", "AIFT_DASHBOARD_TOKEN=\nAIFT_DASHBOARD_TOKEN=\n"):
                p.write_text(content)
                p.chmod(0o600)
                with self.assertRaises(ValueError):
                    provision(p)
                self.assertEqual(p.read_text(), content)
            p.unlink()
            p.symlink_to(Path(folder) / "missing")
            with self.assertRaises(ValueError):
                provision(p)

    def test_reject_public_permissions(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / ".env"
            p.write_text("")
            p.chmod(0o644)
            with self.assertRaises(ValueError):
                provision(p)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path("/root/VPS"))
    parser.add_argument("--domain", default="vps.aifreedomtrust.com")
    parser.add_argument("--prepare-token", action="store_true")
    parser.add_argument("--live", action="store_true", help="explicit local tests on already-patched running container")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(SelfTests))
        return 0 if result.wasSuccessful() else 1
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?", args.domain):
        parser.error("domain must be a hostname")
    dashboard = args.repo.resolve() / "apps/aift-dashboard"
    path = dashboard / ".env"
    results = {}
    if args.prepare_token:
        try:
            command(["git", "check-ignore", "--quiet", "--", "apps/aift-dashboard/.env"], args.repo)
            if os.environ.get(TOKEN):
                raise ValueError("shell override present; reconcile before provisioning")
            results["token_provisioning"] = provision(path)
        except Exception as exc:
            results["token_provisioning"] = "BLOCKED: " + type(exc).__name__
    try:
        results["private_token_file"] = strong(token_entry(read_env(path))[1])
    except Exception:
        results["private_token_file"] = False
    try:
        configured, flag_off, loopback = inspect_runtime(dashboard)
        results.update(compose_token=configured, compose_local_exec_off=flag_off, compose_loopback=loopback)
    except Exception as exc:
        results["compose_inspection"] = "BLOCKED: " + type(exc).__name__
    try:
        results["public_dns_tls_health"] = check_https(args.domain)
    except Exception:
        results["public_dns_tls_health"] = False
    if args.live:
        try:
            running, token, off, loopback = live_container()
            results.update(container_running=running, container_token=strong(token),
                           container_local_exec_off=off, container_loopback=loopback)
            if running and strong(token) and off and loopback:
                results.update(verify_local(token, args.domain))
            else:
                results["local_auth_probes"] = "BLOCKED: unsafe or incomplete runtime prerequisites"
        except Exception as exc:
            results["local_auth_probes"] = "BLOCKED: " + type(exc).__name__
    else:
        results["local_auth_probes"] = "NOT RUN: opt in with --live on patched host"
    # Always explicit: neither a health response nor a checkout SHA proves image provenance.
    results["exact_deployed_revision"] = "MANUAL: verify image provenance against approved SHA"
    results["proxy_access_policy"] = "MANUAL: verify proxy topology and protect public GET/page actions"
    results["physical_browser_and_termux"] = "MANUAL: verify actual devices and browser"
    results["rollback_and_release_approval"] = "MANUAL: require evidence and approval"
    print(json.dumps(results, indent=2))
    return 2  # Never signal complete release acceptance from partial checks.


if __name__ == "__main__":
    raise SystemExit(main())
