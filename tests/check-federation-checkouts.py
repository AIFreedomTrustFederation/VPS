#!/usr/bin/env python3
"""Fail if a Federation integration checkout is dirty or differs from its pinned SHA."""

import argparse
from pathlib import Path
import re
import subprocess
import sys


def verify_checkout(path: Path, expected_sha: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", expected_sha):
        raise ValueError(f"{path}: expected SHA must be 40 lowercase hex digits")
    root = path.resolve(strict=True)

    def git(*args: str) -> str:
        return subprocess.run(["git", *args], cwd=root, check=True,
                              capture_output=True, text=True, timeout=30).stdout.strip()

    if Path(git("rev-parse", "--show-toplevel")).resolve() != root:
        raise ValueError(f"{path}: path is not the checkout root")
    actual_sha = git("rev-parse", "HEAD")
    if actual_sha != expected_sha:
        raise ValueError(f"{path}: checkout SHA {actual_sha} differs from pinned {expected_sha}")
    if git("status", "--porcelain", "--untracked-files=normal"):
        raise ValueError(f"{path}: checkout is dirty")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkout", action="append", required=True, metavar="PATH=SHA",
                        help="checkout root and exact expected commit SHA; repeat for each repo")
    args = parser.parse_args()
    try:
        for item in args.checkout:
            path, separator, sha = item.rpartition("=")
            if not separator or not path:
                raise ValueError("--checkout must be PATH=SHA")
            verify_checkout(Path(path), sha)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(f"Federation checkout binding failed: {error}", file=sys.stderr)
        return 1
    print(f"Federation checkout binding: {len(args.checkout)} pinned clean checkouts verified")
    return 0


if __name__ == "__main__":
    sys.exit(main())
