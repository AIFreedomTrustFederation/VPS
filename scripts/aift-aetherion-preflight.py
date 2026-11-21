#!/usr/bin/env python3
"""Read-only loopback inference probe for a VPS-hosted AIFT Aetherion model.

No model downloads, GitHub credentials, runner registration, secret reads, or
configuration changes. Exit 0 only when the requested checks were observed.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import http.client
import json
import os
import re
import sys
from urllib.parse import urlsplit

MAX_RESPONSE_BYTES = 64 * 1024
MODEL_ID_RE = re.compile(r"[A-Za-z0-9._:/-]{1,128}\Z")

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "old": {"type": "string"},
        "new": {"type": "string"},
        "summary": {"type": "string"},
    },
    "required": ["old", "new", "summary"],
}


class ProbeError(Exception):
    """A checked readiness condition has not been demonstrated."""


def loopback_port(endpoint: str) -> int:
    """Reject DNS, remote hosts, credentials, unusual paths and URL tricks."""
    if not isinstance(endpoint, str) or len(endpoint) > 120:
        raise ProbeError("endpoint_invalid")
    try:
        parts = urlsplit(endpoint)
        hostname = parts.hostname
    except ValueError as exc:
        raise ProbeError("endpoint_invalid") from exc
    if (parts.scheme != "http" or hostname != "127.0.0.1"
            or parts.path.rstrip("/") != "/v1" or parts.username is not None
            or parts.password is not None or parts.query or parts.fragment):
        raise ProbeError("endpoint_must_be_literal_loopback_v1")
    try:
        port = parts.port
    except ValueError as exc:
        raise ProbeError("endpoint_invalid_port") from exc
    if port is None or not 1 <= port <= 65535:
        raise ProbeError("endpoint_invalid_port")
    return port


def request_json(port: int, method: str, path: str, payload: dict | None,
                 timeout: float) -> dict:
    """Bounded single-host HTTP; no redirects, proxies, DNS or auth headers."""
    wire = None if payload is None else json.dumps(payload).encode("utf-8")
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=timeout)
    try:
        headers = {"Accept": "application/json"}
        if wire is not None:
            headers["Content-Type"] = "application/json"
        conn.request(method, path, body=wire, headers=headers)
        response = conn.getresponse()
        if response.status != 200:
            raise ProbeError("inference_http_" + str(response.status))
        raw = response.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise ProbeError("response_exceeds_limit")
        decoded = json.loads(raw)
        if not isinstance(decoded, dict):
            raise ProbeError("response_not_object")
        return decoded
    except (OSError, TimeoutError, http.client.HTTPException) as exc:
        raise ProbeError("local_endpoint_unavailable") from exc
    except (ValueError, UnicodeError) as exc:
        raise ProbeError("response_not_json") from exc
    finally:
        conn.close()


def registered_model(body: dict, model: str) -> bool:
    items = body.get("data")
    return (isinstance(items, list)
            and any(isinstance(item, dict) and item.get("id") == model
                    for item in items))


def structured_inference(port: int, model: str, timeout: float) -> bool:
    """Demonstrate the exact replacement schema AIFT-OS consumes."""
    prompt = {
        "model": model,
        "stream": False,
        "temperature": 0,
        "max_tokens": 192,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "aift_document_edit", "strict": True, "schema": SCHEMA},
        },
        "messages": [
            {"role": "system", "content": (
                "Return only JSON with keys old, new, summary. The old value must "
                "be the exact substring to replace, with no other changes.")},
            {"role": "user", "content": (
                "In the sentence 'AIFT performs local checks.' replace the "
                "substring 'local checks' with 'local verification'. "
                "Do not return a rewritten document.")},
        ],
    }
    result = request_json(port, "POST", "/v1/chat/completions", prompt, timeout)
    choices = result.get("choices")
    if not isinstance(choices, list) or len(choices) != 1:
        raise ProbeError("completion_choice_count_invalid")
    choice = choices[0]
    if not isinstance(choice, dict) or choice.get("finish_reason") == "length":
        raise ProbeError("completion_truncated")
    message = choice.get("message")
    raw = message.get("content") if isinstance(message, dict) else None
    if not isinstance(raw, str) or len(raw) > 4096:
        raise ProbeError("completion_content_invalid")
    try:
        proposed = json.loads(raw)
    except (ValueError, UnicodeError) as exc:
        raise ProbeError("completion_not_json") from exc
    if not isinstance(proposed, dict) or set(proposed) != set(SCHEMA["required"]):
        raise ProbeError("completion_schema_invalid")
    if (proposed.get("old") != "local checks"
            or proposed.get("new") != "local verification"
            or not isinstance(proposed.get("summary"), str)
            or not (1 <= len(proposed["summary"]) <= 160)):
        raise ProbeError("completion_edit_did_not_match")
    return True


def host_capacity() -> dict:
    """Diagnostic only: capacity measurements are not deployment guarantees."""
    available_mib = None
    try:
        with open("/proc/meminfo", encoding="ascii") as f:
            for line in f:
                if line.startswith("MemAvailable:"):
                    available_mib = round(int(line.split()[1]) / 1024)
                    break
    except (OSError, ValueError, IndexError):
        pass
    free_gib = None
    try:
        fs = os.statvfs("/")
        free_gib = round(fs.f_bavail * fs.f_frsize / (1024 ** 3), 2)
    except OSError:
        pass
    return {"available_memory_mib": available_mib, "free_root_disk_gib": free_gib}


def check(endpoint: str, model: str, inference: bool, timeout: float) -> tuple[dict, int]:
    report = {
        "schema_version": 1,
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "model": model if MODEL_ID_RE.fullmatch(model) else "invalid",
        "endpoint": "unverified",
        "probe": "structured_inference" if inference else "registration_only",
        "status": "blocked",
        "checks": {"endpoint": "not_checked", "model_registered": "not_checked",
                   "structured_inference": "not_checked"},
        "capacity_observed": host_capacity(),
        "runner_registration": "not_checked",
        "production_deployment": "not_checked",
    }
    if not MODEL_ID_RE.fullmatch(model):
        report["checks"]["endpoint"] = "invalid_model_identifier"
        return report, 1
    try:
        port = loopback_port(endpoint)
        report["endpoint"] = f"http://127.0.0.1:{port}/v1"
        report["checks"]["endpoint"] = "loopback_only"
        models = request_json(port, "GET", "/v1/models", None, min(timeout, 10.0))
        if not registered_model(models, model):
            report["checks"]["model_registered"] = "missing"
            return report, 1
        report["checks"]["model_registered"] = "observed"
        if inference:
            structured_inference(port, model, timeout)
            report["checks"]["structured_inference"] = "passed"
            report["status"] = "local_inference_verified"
        else:
            report["checks"]["structured_inference"] = "not_requested"
            report["status"] = "model_registration_observed"
        return report, 0
    except ProbeError as exc:
        if report["checks"]["endpoint"] == "not_checked":
            report["checks"]["endpoint"] = str(exc)
        elif report["checks"]["model_registered"] == "not_checked":
            report["checks"]["model_registered"] = str(exc)
        else:
            report["checks"]["structured_inference"] = str(exc)
        return report, 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-url", default=os.environ.get(
        "AIFT_MODEL_URL", "http://127.0.0.1:11434/v1"))
    parser.add_argument("--model", default=os.environ.get(
        "AIFT_MODEL_NAME", "aetherion:latest"))
    parser.add_argument("--probe-inference", action="store_true",
                        help="Run one bounded local structured-output test")
    parser.add_argument("--timeout", type=float, default=180.0,
                        help="Maximum seconds for model inference (default: 180)")
    args = parser.parse_args(argv)
    if not 0.1 <= args.timeout <= 600:
        parser.error("--timeout must be between 0.1 and 600 seconds")
    result, status = check(args.model_url, args.model, args.probe_inference, args.timeout)
    json.dump(result, sys.stdout, sort_keys=True)
    sys.stdout.write("\n")
    return status


if __name__ == "__main__":
    sys.exit(main())
