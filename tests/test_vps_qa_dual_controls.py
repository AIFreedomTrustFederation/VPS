#!/usr/bin/env python3
"""Cross-PR contract: VPS QA must retain Docker and commit-identity controls.

This guards against dropping either previously independent safeguard when
reconciling the Docker context and checkout-SHA pull requests.
"""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / '.github/workflows/aift-local-qa.yml'


class DualControlIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = json.loads(WORKFLOW.read_text(encoding='utf-8'))
        cls.steps = cls.workflow['jobs']['local-qa']['steps']
        cls.names = [step.get('name') for step in cls.steps]

    def test_both_regressions_execute_before_final_sha_gate(self):
        self.assertEqual(len(self.names), len(set(self.names)), 'duplicate QA step names')
        docker = self.names.index('Verify dashboard Docker context excludes credentials')
        sha_tests = self.names.index('Regression: checkout commit binding')
        integration = self.names.index('Regression: combined QA safeguards')
        final = self.names.index('Verify checkout and execution SHA')
        self.assertLess(docker, final)
        self.assertLess(sha_tests, final)
        self.assertLess(integration, final)
        self.assertEqual(final, len(self.steps) - 1, 'final integrity gate must run last')
        self.assertIn('tests/test-dashboard-docker-context.py', self.steps[docker]['run'])
        self.assertIn("-p 'test_local_qa_commit_binding.py'", self.steps[sha_tests]['run'])

    def test_docker_probe_is_fail_closed_on_hosted_runner(self):
        docker = next(s for s in self.steps if s['name'] == 'Verify dashboard Docker context excludes credentials')
        self.assertIn('docker info >/dev/null &&', docker['run'])
        self.assertNotIn('|| true', docker['run'])
        self.assertNotIn('continue-on-error', docker)

    def test_sha_gate_is_fail_closed(self):
        gate = self.steps[-1]['run']
        for clause in ('set -euo pipefail', '${GITHUB_SHA:-}', 'git rev-parse HEAD',
                       'git status --porcelain --untracked-files=normal', 'test -z "$status"'):
            self.assertIn(clause, gate)
        self.assertNotIn('|| true', gate)

    def test_workflow_remains_non_deploying_and_read_only(self):
        self.assertEqual(self.workflow['permissions'], {'contents': 'read'})
        self.assertEqual(self.workflow['on'], {'push': {'branches': ['main']}, 'pull_request': {}})
        checkout = self.steps[0]
        self.assertEqual(checkout['with']['persist-credentials'], False)
        self.assertTrue(checkout['uses'].startswith('actions/checkout@'))
        self.assertNotIn('workflow_dispatch', self.workflow['on'])

    def test_both_test_sources_and_dockerignore_are_present(self):
        for path in ('tests/test-dashboard-docker-context.py',
                     'tests/test_local_qa_commit_binding.py',
                     'apps/aift-dashboard/.dockerignore'):
            self.assertTrue((ROOT / path).is_file(), f'missing integrated source: {path}')


if __name__ == '__main__':
    unittest.main()
