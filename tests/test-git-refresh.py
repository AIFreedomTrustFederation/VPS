#!/usr/bin/env python3
"""Real-Git integration regressions for the VPS node refresh script."""
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(os.environ.get('AIFT_REFRESH_SCRIPT', 'scripts/aift-git-refresh.sh')).resolve()


def git(*args, cwd=None):
    return subprocess.run(['git', *map(str, args)], cwd=cwd, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)


class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='aift-refresh-')
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.node = self.root / 'node with spaces'
        self.remote = self.root / 'origin.git'

    def make_remote(self):
        git('init', '--bare', self.remote)
        seed = self.root / 'seed'
        git('init', '-b', 'main', seed)
        git('config', 'user.name', 'Test Operator', cwd=seed)
        git('config', 'user.email', 'test@example.invalid', cwd=seed)
        (seed / 'README.md').write_text('from remote\n')
        git('add', 'README.md', cwd=seed)
        git('commit', '-m', 'seed', cwd=seed)
        git('remote', 'add', 'origin', self.remote, cwd=seed)
        git('push', '-u', 'origin', 'main', cwd=seed)
        git('symbolic-ref', 'HEAD', 'refs/heads/main', cwd=self.remote)
        return seed

    def run_refresh(self, url):
        env = os.environ.copy()
        env.update(AIFT_NODE_DIR=str(self.node), AIFT_REPO_URL=str(url))
        return subprocess.run(['bash', str(SCRIPT)], env=env, text=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def test_failed_clone_preserves_existing_non_git_node(self):
        self.node.mkdir()
        (self.node / 'important.txt').write_text('unpublished local data')
        result = self.run_refresh(self.root / 'missing-remote.git')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.node / 'important.txt').read_text(), 'unpublished local data')
        self.assertFalse(list(self.root.glob('node with spaces-backup-*')))
        self.assertFalse(list(self.root.glob('node with spaces.staging.*')))

    def test_successful_clone_keeps_backup(self):
        self.make_remote()
        self.node.mkdir()
        (self.node / 'important.txt').write_text('unpublished local data')
        result = self.run_refresh(self.remote)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual((self.node / 'README.md').read_text(), 'from remote\n')
        backups = list(self.root.glob('node with spaces-backup-*'))
        self.assertEqual(len(backups), 1)
        self.assertEqual((backups[0] / 'important.txt').read_text(), 'unpublished local data')
        self.assertFalse(list(self.root.glob('node with spaces.staging.*')))

    def test_fresh_checkout(self):
        self.make_remote()
        result = self.run_refresh(self.remote)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertTrue((self.node / '.git').is_dir())
        self.assertFalse(list(self.root.glob('node with spaces-backup-*')))

    def test_existing_git_checkout_fast_forward(self):
        seed = self.make_remote()
        git('clone', self.remote, self.node)
        (seed / 'README.md').write_text('updated remotely\n')
        git('commit', '-am', 'remote update', cwd=seed)
        git('push', cwd=seed)
        result = self.run_refresh(self.remote)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual((self.node / 'README.md').read_text(), 'updated remotely\n')
        self.assertFalse(list(self.root.glob('node with spaces-backup-*')))


if __name__ == '__main__':
    unittest.main(verbosity=2)
