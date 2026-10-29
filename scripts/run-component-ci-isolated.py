#!/usr/bin/env python3
"""Run component tests against a disposable, local-only Supabase fixture."""

import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SUPABASE = ROOT / 'node_modules/.bin/supabase'
MIGRATIONS = (
    '20250101000000_initial_schema.sql',
    '20250101000001_enable_rls.sql',
    '20251210185000_fix_uuid_default_notes.sql',
)
EXCLUDED = 'studio,inbucket,analytics,realtime,edge-runtime,storage,imgproxy,vector,meta'
JWT_PATTERN = re.compile(r'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}')
LOOPBACK_BIND_OPTION = 'com.docker.network.bridge.host_binding_ipv4'
BIND_PROBE_LABEL = 'com.everfreenote.component-bind-probe'
BIND_PROBE_IMAGE = 'alpine:3.22.1'


class FixtureIsolationError(ValueError):
    """A safe, actionable fixture isolation error without credential values."""


def require_secure_docker_version(version):
    # Docker < 28 can expose ports published to localhost to hosts on the same L2 segment.
    match = re.match(r'^(\d+)\.', version.strip())
    if not match or int(match.group(1)) < 28:
        raise FixtureIsolationError('Docker Engine 28 or newer is required for loopback-only ports')


def docker_output(args, env):
    return subprocess.run(['docker', *args], cwd=ROOT, env=env, capture_output=True,
                          text=True, check=True, timeout=30).stdout


def verify_fixture_network(network_id, env):
    network_data = json.loads(docker_output(['network', 'inspect', network_id], env))
    if len(network_data) != 1:
        raise FixtureIsolationError('Could not verify the fixture network')
    network = network_data[0]
    if (network.get('Id') != network_id or network.get('Driver') != 'bridge'
            or network.get('Options', {}).get(LOOPBACK_BIND_OPTION) != '127.0.0.1'):
        raise FixtureIsolationError('Fixture network is not configured for loopback binding')


def verify_host_listener(port, env):
    # Docker Desktop may forward VM loopback ports on all host interfaces.
    try:
        result = subprocess.run(['lsof', '-nP', f'-iTCP:{port}', '-sTCP:LISTEN', '-F', 'n'],
                                cwd=ROOT, env=env, capture_output=True, text=True, timeout=30)
    except FileNotFoundError as error:
        raise FixtureIsolationError('lsof is required to verify Docker Desktop host listeners') from error
    listeners = [line[1:] for line in result.stdout.splitlines() if line.startswith('n')]
    if result.returncode != 0 or not listeners or any(item != f'127.0.0.1:{port}' for item in listeners):
        raise FixtureIsolationError('Could not verify a loopback-only Docker Desktop host listener')


def verify_bind_probe(project, network_id, docker_desktop, env):
    # Probe without credentials or data before starting Supabase: Desktop may ignore bridge defaults.
    owner = secrets.token_hex(16)
    label = f'{BIND_PROBE_LABEL}={owner}'
    try:
        probe_id = docker_output([
            'create', '--name', f'{project}-bind-probe', '--network', network_id,
            '--publish', '12345/tcp', '--label', label, '--entrypoint', 'sleep', BIND_PROBE_IMAGE, '120',
        ], env).strip()
        if not re.fullmatch(r'[0-9a-f]{64}', probe_id):
            raise FixtureIsolationError('Unexpected Docker probe container ID')
        docker_output(['start', probe_id], env)
        settings = json.loads(docker_output(['inspect', '--format', '{{json .NetworkSettings}}', probe_id], env))
        networks = settings.get('Networks') or {}
        if not networks or any(item.get('NetworkID') != network_id for item in networks.values()):
            raise FixtureIsolationError('The Docker probe is attached to an unexpected network')
        bindings = (settings.get('Ports') or {}).get('12345/tcp') or []
        if len(bindings) != 1 or bindings[0].get('HostIp') != '127.0.0.1':
            raise FixtureIsolationError('Docker did not publish the probe port on IPv4 loopback only')
        host_port = bindings[0].get('HostPort', '')
        if not host_port.isdecimal() or not 1 <= int(host_port) <= 65535:
            raise FixtureIsolationError('Invalid Docker probe host port')
        if docker_desktop:
            verify_host_listener(host_port, env)
    finally:
        # A unique label identifies only this invocation, even if creation was interrupted.
        owned = docker_output(['ps', '--all', '--quiet', '--filter', f'label={label}'], env).splitlines()
        for container_id in owned:
            if not re.fullmatch(r'[0-9a-f]{12,64}', container_id):
                raise FixtureIsolationError('Unexpected Docker probe container ID during cleanup')
            docker_output(['rm', '--force', container_id], env)


def verify_fixture_bindings(project, network_id, port, docker_desktop, env):
    verify_fixture_network(network_id, env)
    container_ids = docker_output([
        'ps', '--quiet', '--filter', f'label=com.supabase.cli.project={project}',
    ], env).splitlines()
    if not container_ids:
        raise FixtureIsolationError('No running fixture containers were found')
    published_ports = set()
    for container_id in container_ids:
        settings = json.loads(docker_output([
            'inspect', '--format', '{{json .NetworkSettings}}', container_id,
        ], env))
        networks = settings.get('Networks') or {}
        if not networks or any(item.get('NetworkID') != network_id for item in networks.values()):
            raise FixtureIsolationError('Fixture container is attached to an unexpected network')
        for bindings in (settings.get('Ports') or {}).values():
            for binding in bindings or []:
                if binding.get('HostIp') != '127.0.0.1':
                    raise FixtureIsolationError('Fixture published a port outside IPv4 loopback')
                if docker_desktop:
                    verify_host_listener(binding.get('HostPort', ''), env)
                published_ports.add(binding.get('HostPort'))
    if not {str(port), str(port + 1)}.issubset(published_ports):
        raise FixtureIsolationError('Expected local API and database port bindings were not found')


def safe_start_output(output):
    # `supabase start` can print local keys. Never copy key-bearing lines to logs.
    lines = [line for line in output.splitlines() if not re.search(r'(?i)(key|secret|password|token)', line)]
    return JWT_PATTERN.sub('[redacted]', re.sub(r'://[^/\s]+@', '://[redacted]@', '\n'.join(lines[-80:])))


def redact(value, keys):
    for key in keys:
        value = value.replace(key, '[redacted]')
    value = JWT_PATTERN.sub('[redacted]', value)
    return re.sub(r'Synthetic-privacy-[0-9]+!', '[redacted]', value)


def redact_ci_artifacts(keys):
    # Artifacts can outlive the disposable stack. Keep them useful without test credentials.
    for directory in (ROOT / 'cypress/results', ROOT / 'allure-results/component'):
        if not directory.is_dir():
            continue
        for path in directory.rglob('*'):
            if path.is_symlink() or not path.is_file() or path.suffix not in ('.json', '.jsonl', '.xml', '.txt', '.log'):
                continue
            original = path.read_text(encoding='utf-8', errors='replace')
            cleaned = redact(original, keys)
            if cleaned != original:
                path.write_text(cleaned, encoding='utf-8')


def run():
    command_args = sys.argv[1:]
    if command_args[:1] == ['--']:
        command_args = command_args[1:]
    if not command_args:
        raise ValueError('Usage: run-component-ci-isolated.py -- <test command> [args...]')
    port = int(os.environ.get('COMPONENT_FIXTURE_API_PORT', '63421'))
    if not 1025 <= port <= 65533:
        raise ValueError('COMPONENT_FIXTURE_API_PORT is outside the valid range')
    monitor = os.environ.get('COMPONENT_FIXTURE_MONITOR_URL')
    if monitor:
        parsed = urllib.parse.urlparse(monitor)
        if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost', '::1'):
            raise ValueError('Preview monitor must use a loopback HTTP URL')

    project = 'efn-component-' + secrets.token_hex(6)
    temp_parent = os.environ.get('RUNNER_TEMP') or None
    current = None
    current_lock = threading.Lock()
    degraded = threading.Event()
    finished = threading.Event()

    def monitor_preview():
        failures = 0
        while not finished.is_set():
            try:
                started = time.monotonic()
                with urllib.request.urlopen(monitor, timeout=3) as response:
                    ok = response.status == 200 and time.monotonic() - started < 3
            except Exception:
                ok = False
            failures = 0 if ok else failures + 1
            if failures >= 2:
                degraded.set()
                print('Stopping this fixture because the monitored preview is unavailable.', flush=True)
                with current_lock:
                    if current is not None and current.poll() is None:
                        try:
                            os.killpg(current.pid, signal.SIGTERM)
                        except ProcessLookupError:
                            pass
                return
            finished.wait(4)

    with tempfile.TemporaryDirectory(prefix='efn-component-ci-', dir=temp_parent) as temp:
        workdir = Path(temp)
        supabase_dir = workdir / 'supabase'
        migration_dir = supabase_dir / 'migrations'
        migration_dir.mkdir(parents=True)
        config = (ROOT / 'cypress/fixtures/component-ci/config.toml').read_text()
        for old, new in {
            '__PROJECT_ID__': project,
            '__API_PORT__': str(port),
            '__DB_PORT__': str(port + 1),
            '__SHADOW_PORT__': str(port - 1),
        }.items():
            if config.count(old) != 1:
                raise ValueError('Invalid component fixture configuration template')
            config = config.replace(old, new)
        (supabase_dir / 'config.toml').write_text(config)
        for name in MIGRATIONS:
            shutil.copyfile(ROOT / 'supabase/migrations' / name, migration_dir / name)
        fixture_grants = '20250101000003_fixture_table_grants.sql'
        shutil.copyfile(ROOT / 'cypress/fixtures/component-ci' / fixture_grants, migration_dir / fixture_grants)

        child_env = os.environ.copy()
        # Do not allow a developer or CI Stage credential to configure this fixture.
        credential_prefixes = ('SUPABASE_', 'NEXT_PUBLIC_SUPABASE_', 'CYPRESS_AUDIT_',
                               'NEXT_PUBLIC_TEST_AUTH_', 'NEXT_PUBLIC_SKIP_AUTH_')
        for key in list(child_env):
            if key.startswith(credential_prefixes):
                child_env.pop(key)
        if monitor:
            threading.Thread(target=monitor_preview, daemon=True).start()
        code = 1
        fixture_keys = []
        network_id = None
        network_cleanup_target = None
        fixture_started = False
        try:
            version = docker_output(['version', '--format', '{{.Server.Version}}'], child_env)
            require_secure_docker_version(version)
            server_os = docker_output(['info', '--format', '{{.OperatingSystem}}'], child_env)
            docker_desktop = sys.platform == 'darwin' or 'docker desktop' in server_os.lower()
            network_name = f'{project}-network'
            network_id = docker_output([
                'network', 'create', '--driver', 'bridge', '--opt', f'{LOOPBACK_BIND_OPTION}=127.0.0.1',
                network_name,
            ], child_env).strip()
            # Only a successful create gives us ownership of this unique name.
            network_cleanup_target = network_name
            if not re.fullmatch(r'[0-9a-f]{64}', network_id):
                raise FixtureIsolationError('Unexpected Docker network ID')
            network_cleanup_target = network_id
            verify_fixture_network(network_id, child_env)
            verify_bind_probe(project, network_id, docker_desktop, child_env)
            if degraded.is_set():
                return 1
            command = [str(SUPABASE), 'start', '--workdir', str(workdir), '--network-id', network_id,
                       '--exclude', EXCLUDED]
            fixture_started = True
            with current_lock:
                current = subprocess.Popen(command, cwd=ROOT, env=child_env, stdout=subprocess.PIPE,
                                           stderr=subprocess.STDOUT, text=True, start_new_session=True)
            output, _ = current.communicate(timeout=600)
            if current.returncode != 0 or degraded.is_set():
                if not degraded.is_set():
                    print('Isolated Supabase startup failed:', file=sys.stderr)
                    print(safe_start_output(output), file=sys.stderr)
                return 1

            verify_fixture_bindings(project, network_id, port, docker_desktop, child_env)
            result = subprocess.run([str(SUPABASE), 'status', '--workdir', str(workdir),
                                     '--network-id', network_id, '-o', 'json'],
                                    cwd=ROOT, env=child_env, capture_output=True, text=True, check=True, timeout=30)
            if degraded.is_set():
                return 1
            values = json.loads(result.stdout)
            expected_url = f'http://127.0.0.1:{port}'
            if values.get('API_URL', '').rstrip('/') != expected_url:
                raise ValueError('Supabase returned an unexpected API endpoint')
            anon, service = values['ANON_KEY'], values['SERVICE_ROLE_KEY']
            if not anon or not service:
                raise ValueError('Local fixture keys are missing')
            fixture_keys = [anon, service]
            if child_env.get('GITHUB_ACTIONS') == 'true':
                # GitHub consumes these workflow commands and masks the ephemeral keys.
                print(f'::add-mask::{anon}', flush=True)
                print(f'::add-mask::{service}', flush=True)
            child_env.update({
                'NEXT_PUBLIC_SUPABASE_URL': expected_url,
                'NEXT_PUBLIC_SUPABASE_ANON_KEY': anon,
                'NEXT_PUBLIC_ENABLE_TEST_AUTH': 'false',
                'CYPRESS_AUDIT_SUPABASE_URL': expected_url,
                'CYPRESS_AUDIT_ANON_KEY': anon,
                'CYPRESS_AUDIT_SERVICE_KEY': service,
            })
            print(f'Running component tests against isolated localhost:{port}.', flush=True)
            with current_lock:
                current = subprocess.Popen(command_args, cwd=ROOT, env=child_env, stdout=subprocess.PIPE,
                                           stderr=subprocess.STDOUT, text=True, start_new_session=True)
            for line in current.stdout:
                print(redact(line, fixture_keys), end='', flush=True)
            code = current.wait()
            if degraded.is_set():
                code = 1
        finally:
            finished.set()
            with current_lock:
                if current is not None and current.poll() is None:
                    try:
                        os.killpg(current.pid, signal.SIGTERM)
                    except ProcessLookupError:
                        pass
            if current is not None:
                try:
                    current.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    try:
                        os.killpg(current.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    current.wait(timeout=10)
            # Only stop the random project and remove the network created by this invocation.
            if fixture_started:
                stopped = subprocess.run([str(SUPABASE), 'stop', '--project-id', project,
                                          '--network-id', network_id, '--no-backup'],
                                         cwd=ROOT, env=child_env, capture_output=True, text=True)
                if stopped.returncode != 0:
                    print('Could not confirm cleanup of the isolated component fixture.', file=sys.stderr)
                    code = 1
                else:
                    print('Isolated component fixture stopped.', flush=True)
            if network_cleanup_target:
                removed = subprocess.run(['docker', 'network', 'rm', network_cleanup_target], cwd=ROOT, env=child_env,
                                         capture_output=True, text=True)
                if removed.returncode != 0:
                    print('Could not remove the isolated component network.', file=sys.stderr)
                    code = 1
            if fixture_keys and child_env.get('GITHUB_ACTIONS') == 'true':
                redact_ci_artifacts(fixture_keys)
        return code


def interrupt(_signal, _frame):
    raise InterruptedError('Component fixture interrupted')


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, interrupt)
    try:
        sys.exit(run())
    except FixtureIsolationError as error:
        print(f'Isolated component fixture failed: {error}', file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, KeyError, json.JSONDecodeError, subprocess.SubprocessError) as error:
        print(f'Isolated component fixture failed: {type(error).__name__}', file=sys.stderr)
        sys.exit(1)
