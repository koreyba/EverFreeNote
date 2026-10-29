"""Safety checks for the disposable component-test fixture runner."""

from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name('run-component-ci-isolated.py')
SPEC = importlib.util.spec_from_file_location('component_fixture_runner', SCRIPT)
fixture = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fixture)


class FixtureRunnerTests(unittest.TestCase):
    def run_fixture(self, *, child_code=0, endpoint='http://127.0.0.1:63421', stop_code=0):
        started = []
        stopped = []
        local_anon = 'synthetic-anon-fixture-key'
        local_service = 'synthetic-service-fixture-key'
        captured = io.StringIO()

        class FakeProcess:
            def __init__(self, command, **kwargs):
                self.command = command
                self.env = dict(kwargs['env'])
                self.returncode = 0 if command[1:2] == ['start'] else child_code
                self.stdout = io.StringIO(f'test output {local_anon} {local_service}\n')
                self.pid = 123
                started.append(self)

            def communicate(self, timeout=None):
                return '', None

            def poll(self):
                return self.returncode

            def wait(self, timeout=None):
                return self.returncode

        def fake_run(command, **kwargs):
            if command[1:2] == ['status']:
                return subprocess.CompletedProcess(command, 0, json.dumps({
                    'API_URL': endpoint, 'ANON_KEY': local_anon, 'SERVICE_ROLE_KEY': local_service,
                }), '')
            self.assertEqual(command[1:2], ['stop'])
            self.assertEqual(command[-1], '--no-backup')
            self.assertTrue(command[3].startswith('efn-component-'))
            stopped.append(command[3])
            return subprocess.CompletedProcess(command, stop_code, '', '')

        env = {
            'PATH': os.environ['PATH'],
            'SUPABASE_ACCESS_TOKEN': 'old-token',
            'NEXT_PUBLIC_SUPABASE_URL': 'https://stage.invalid',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'old-key',
            'CYPRESS_AUDIT_SERVICE_KEY': 'old-service',
        }
        with patch.dict(os.environ, env, clear=True), patch.object(sys, 'argv', ['runner', '--', 'component-test']), \
             patch.object(fixture.subprocess, 'Popen', FakeProcess), patch.object(fixture.subprocess, 'run', fake_run), \
             redirect_stdout(captured), redirect_stderr(captured):
            try:
                result = fixture.run()
            except ValueError:
                result = 'invalid endpoint'

        self.assertEqual(len(stopped), 1, 'only the disposable project must be stopped')
        self.assertEqual(len(stopped[0]), len('efn-component-') + 12)
        self.assertNotIn('SUPABASE_ACCESS_TOKEN', started[0].env)
        self.assertNotIn('NEXT_PUBLIC_SUPABASE_URL', started[0].env)
        if endpoint == 'http://127.0.0.1:63421':
            self.assertEqual(started[1].env['NEXT_PUBLIC_SUPABASE_URL'], endpoint)
            self.assertEqual(started[1].env['CYPRESS_AUDIT_SERVICE_KEY'], local_service)
            self.assertNotIn(local_anon, captured.getvalue())
            self.assertNotIn(local_service, captured.getvalue())
        return result

    def test_success_uses_local_credentials_and_cleans_up(self):
        self.assertEqual(self.run_fixture(), 0)

    def test_failed_test_or_cleanup_fails_the_run(self):
        self.assertEqual(self.run_fixture(child_code=1), 1)
        self.assertEqual(self.run_fixture(stop_code=1), 1)

    def test_unexpected_endpoint_fails_closed_and_cleans_up(self):
        self.assertEqual(self.run_fixture(endpoint='https://stage.invalid'), 'invalid endpoint')

    def test_failed_start_diagnostics_omit_credentials(self):
        output = 'API key: synthetic-api-key\nConnecting to postgres://user:password@127.0.0.1/db\nBearer eyJabcdefghijk.abcdefghijk.abcdefghijk\n'
        cleaned = fixture.safe_start_output(output)
        self.assertNotIn('synthetic-api-key', cleaned)
        self.assertNotIn('user:password', cleaned)
        self.assertNotIn('eyJabcdefghijk', cleaned)

    def test_log_redaction_covers_keys_tokens_and_synthetic_passwords(self):
        sample = 'anon-value eyJabcdefghijk.abcdefghijk.abcdefghijk Synthetic-privacy-123456!'
        cleaned = fixture.redact(sample, ['anon-value'])
        self.assertEqual(cleaned, '[redacted] [redacted] [redacted]')


if __name__ == '__main__':
    unittest.main()
