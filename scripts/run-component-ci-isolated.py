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
        try:
            command = [str(SUPABASE), 'start', '--workdir', str(workdir), '--exclude', EXCLUDED]
            with current_lock:
                current = subprocess.Popen(command, cwd=ROOT, env=child_env, stdout=subprocess.PIPE,
                                           stderr=subprocess.STDOUT, text=True, start_new_session=True)
            output, _ = current.communicate(timeout=600)
            if current.returncode != 0 or degraded.is_set():
                if not degraded.is_set():
                    print('Isolated Supabase startup failed:', file=sys.stderr)
                    print(safe_start_output(output), file=sys.stderr)
                return 1

            result = subprocess.run([str(SUPABASE), 'status', '--workdir', str(workdir), '-o', 'json'],
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
            # This project ID is freshly generated; never stop another project's stack.
            stopped = subprocess.run([str(SUPABASE), 'stop', '--project-id', project, '--no-backup'],
                                     cwd=ROOT, env=child_env, capture_output=True, text=True)
            if stopped.returncode != 0:
                print('Could not confirm cleanup of the isolated component fixture.', file=sys.stderr)
                code = 1
            else:
                print('Isolated component fixture stopped.', flush=True)
            if fixture_keys and child_env.get('GITHUB_ACTIONS') == 'true':
                redact_ci_artifacts(fixture_keys)
        return code


def interrupt(_signal, _frame):
    raise InterruptedError('Component fixture interrupted')


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, interrupt)
    try:
        sys.exit(run())
    except (OSError, ValueError, KeyError, json.JSONDecodeError, subprocess.SubprocessError) as error:
        print(f'Isolated component fixture failed: {type(error).__name__}', file=sys.stderr)
        sys.exit(1)
