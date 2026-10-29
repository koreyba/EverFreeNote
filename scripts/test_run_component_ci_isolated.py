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
    def run_fixture(self, *, child_code=0, endpoint='http://127.0.0.1:63421', stop_code=0,
                    binding='127.0.0.1', network_option='127.0.0.1', extra_network=False,
                    missing_db_port=False, no_containers=False, network_remove_code=0,
                    host_listener='loopback', probe_extra_network=False, actual_binding=None,
                    actual_host_listener=None):
        started = []
        stopped = []
        removed_networks = []
        removed_probes = []
        network_id = 'a' * 64
        probe_id = 'b' * 64
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
            if command[0] == 'docker':
                if command[1:2] == ['version']:
                    return subprocess.CompletedProcess(command, 0, '29.1.0\n', '')
                if command[1:2] == ['info']:
                    return subprocess.CompletedProcess(command, 0, 'Docker Desktop\n', '')
                if command[1:3] == ['network', 'create']:
                    self.assertIn('com.docker.network.bridge.host_binding_ipv4=127.0.0.1', command)
                    return subprocess.CompletedProcess(command, 0, network_id + '\n', '')
                if command[1:3] == ['network', 'inspect']:
                    return subprocess.CompletedProcess(command, 0, json.dumps([{
                        'Id': network_id, 'Driver': 'bridge',
                        'Options': {'com.docker.network.bridge.host_binding_ipv4': network_option},
                    }]), '')
                if command[1:3] == ['network', 'rm']:
                    self.assertEqual(command[3], network_id)
                    removed_networks.append(command[3])
                    return subprocess.CompletedProcess(command, network_remove_code, '', '')
                if command[1:2] == ['create']:
                    self.assertIn('--publish', command)
                    self.assertEqual(command[command.index('--publish') + 1], '12345/tcp')
                    self.assertIn(network_id, command)
                    return subprocess.CompletedProcess(command, 0, probe_id + '\n', '')
                if command[1:2] == ['start']:
                    self.assertEqual(command[-1], probe_id)
                    return subprocess.CompletedProcess(command, 0, probe_id + '\n', '')
                if command[1:2] == ['rm']:
                    self.assertEqual(command[-1], probe_id)
                    removed_probes.append(probe_id)
                    return subprocess.CompletedProcess(command, 0, probe_id + '\n', '')
                if command[1:2] == ['ps']:
                    if '--all' in command:
                        return subprocess.CompletedProcess(command, 0, probe_id + '\n', '')
                    return subprocess.CompletedProcess(command, 0, '' if no_containers else 'api-id\ndb-id\n', '')
                if command[1:2] == ['inspect']:
                    if command[-1] == probe_id:
                        probe_networks = {'fixture': {'NetworkID': network_id}}
                        if probe_extra_network:
                            probe_networks['other'] = {'NetworkID': 'c' * 64}
                        return subprocess.CompletedProcess(command, 0, json.dumps({
                            'Networks': probe_networks,
                            'Ports': {'12345/tcp': [{'HostIp': binding, 'HostPort': '49152'}]},
                        }), '')
                    self.assertIn(command[-1], ('api-id', 'db-id'))
                    host_port = '63421' if command[-1] == 'api-id' else ('1' if missing_db_port else '63422')
                    networks = {'fixture': {'NetworkID': network_id}}
                    if extra_network:
                        networks['other'] = {'NetworkID': 'b' * 64}
                    return subprocess.CompletedProcess(command, 0, json.dumps({
                        'Networks': networks,
                        'Ports': {'8000/tcp': [{'HostIp': actual_binding or binding, 'HostPort': host_port}]},
                    }), '')
                self.fail(f'unexpected docker command: {command[:3]}')
            if command[0] == 'lsof':
                host_port = command[2].split(':')[-1]
                if host_listener == 'missing':
                    return subprocess.CompletedProcess(command, 1, '', '')
                state = actual_host_listener if host_port != '49152' and actual_host_listener else host_listener
                address = '*' if state == 'wildcard' else '127.0.0.1'
                return subprocess.CompletedProcess(command, 0, f'n{address}:{host_port}\n', '')
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

        if (network_option != '127.0.0.1' or binding != '127.0.0.1'
                or host_listener != 'loopback' or probe_extra_network):
            self.assertEqual(stopped, [], 'the fixture must not start on an unsafe network')
            self.assertEqual(started, [], 'the fixture must not start on an unsafe network')
        else:
            self.assertEqual(len(stopped), 1, 'only the disposable project must be stopped')
            self.assertEqual(len(stopped[0]), len('efn-component-') + 12)
        self.assertEqual(removed_networks, [network_id], 'only the created network must be removed')
        self.assertEqual(removed_probes, [] if network_option != '127.0.0.1' else [probe_id])
        if started:
            self.assertNotIn('SUPABASE_ACCESS_TOKEN', started[0].env)
            self.assertNotIn('NEXT_PUBLIC_SUPABASE_URL', started[0].env)
            self.assertIn('--network-id', started[0].command)
            self.assertIn(network_id, started[0].command)
        if len(started) > 1:
            self.assertEqual(started[1].env['NEXT_PUBLIC_SUPABASE_URL'], endpoint)
            self.assertEqual(started[1].env['CYPRESS_AUDIT_SERVICE_KEY'], local_service)
            self.assertNotIn(local_anon, captured.getvalue())
            self.assertNotIn(local_service, captured.getvalue())
        else:
            self.assertNotEqual((binding, network_option, extra_network, missing_db_port, no_containers,
                                 host_listener, probe_extra_network, actual_binding, actual_host_listener, endpoint),
                                ('127.0.0.1', '127.0.0.1', False, False, False, 'loopback', False,
                                 None, None, 'http://127.0.0.1:63421'), 'safe fixtures must reach the test command')
        return result

    def test_success_uses_local_credentials_and_cleans_up(self):
        self.assertEqual(self.run_fixture(), 0)

    def test_failed_test_or_cleanup_fails_the_run(self):
        self.assertEqual(self.run_fixture(child_code=1), 1)
        self.assertEqual(self.run_fixture(stop_code=1), 1)
        self.assertEqual(self.run_fixture(network_remove_code=1), 1)

    def test_unexpected_endpoint_fails_closed_and_cleans_up(self):
        self.assertEqual(self.run_fixture(endpoint='https://stage.invalid'), 'invalid endpoint')

    def test_unsafe_or_unverifiable_network_fails_closed_and_cleans_up(self):
        cases = (
            {'binding': '0.0.0.0'},
            {'binding': '::'},
            {'network_option': '0.0.0.0'},
            {'host_listener': 'wildcard'},
            {'host_listener': 'missing'},
            {'probe_extra_network': True},
            {'actual_binding': '0.0.0.0'},
            {'actual_host_listener': 'wildcard'},
            {'extra_network': True},
            {'missing_db_port': True},
            {'no_containers': True},
        )
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.run_fixture(**case), 'invalid endpoint')

    def test_docker_version_must_support_secure_loopback_publishing(self):
        fixture.require_secure_docker_version('28.0.0')
        fixture.require_secure_docker_version('29.9.2')
        for version in ('27.5.1', 'unknown', ''):
            with self.subTest(version=version), self.assertRaises(ValueError):
                fixture.require_secure_docker_version(version)

    def test_network_create_failure_never_stops_or_removes_an_unowned_resource(self):
        commands = []

        def fake_run(command, **kwargs):
            commands.append(command)
            if command[1:2] == ['version']:
                return subprocess.CompletedProcess(command, 0, '29.1.0\n', '')
            if command[1:2] == ['info']:
                return subprocess.CompletedProcess(command, 0, 'Docker Desktop\n', '')
            raise subprocess.CalledProcessError(1, command)

        with patch.dict(os.environ, {'PATH': os.environ['PATH']}, clear=True), \
             patch.object(sys, 'argv', ['runner', '--', 'component-test']), \
             patch.object(fixture.subprocess, 'Popen') as popen, \
             patch.object(fixture.subprocess, 'run', fake_run):
            with self.assertRaises(subprocess.CalledProcessError):
                fixture.run()
            popen.assert_not_called()
        self.assertEqual([command[1:3] for command in commands],
                         [['version', '--format'], ['info', '--format'], ['network', 'create']])

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
