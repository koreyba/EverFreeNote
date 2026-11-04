"""Exercise the real Cypress coverage plugin and NYC reporting boundary."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'node_modules/@cypress/code-coverage/dist/lib/task.js'


class ComponentCoverageReportingTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='efn-coverage-report-')
        self.addCleanup(directory.cleanup)
        self.project = Path(directory.name).resolve()
        shutil.copyfile(ROOT / 'package.json', self.project / 'package.json')
        config = ROOT / 'nyc.config.cjs'
        if config.exists():
            shutil.copyfile(config, self.project / config.name)
        (self.project / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
        (self.project / 'app').mkdir()
        source = self.project / 'app/covered.js'
        source.write_text('const covered = 1;\nconst missed = 2;\n')
        (self.project / 'app/unvisited.js').write_text('export const unvisited = 3;\n')
        coverage = {
            str(source): {
                'path': str(source), 'hash': 'coverage-regression',
                'statementMap': {
                    '0': {'start': {'line': 1, 'column': 0}, 'end': {'line': 1, 'column': 18}},
                    '1': {'start': {'line': 2, 'column': 0}, 'end': {'line': 2, 'column': 17}},
                },
                's': {'0': 2, '1': 0}, 'fnMap': {}, 'f': {}, 'branchMap': {}, 'b': {},
            },
        }
        (self.project / 'input.json').write_text(json.dumps(coverage))

    def collect(self, *, deferred):
        env = dict(os.environ)
        env.pop('COMPONENT_COVERAGE_DEFER_REPORT', None)
        if deferred:
            env['COMPONENT_COVERAGE_DEFER_REPORT'] = 'true'
        script = """
const fs = require('node:fs');
let tasks;
require(process.argv[1])((event, handlers) => {
  if (event === 'task') tasks = handlers;
}, { expose: {} });
tasks.combineCoverage(fs.readFileSync('input.json', 'utf8'));
Promise.resolve(tasks.coverageReport()).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
"""
        result = subprocess.run(['node', '-e', script, str(PLUGIN)], cwd=self.project,
                                env=env, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads((self.project / '.nyc_output/out.json').read_text())

    def test_deferred_report_still_saves_counters_and_unvisited_scope(self):
        raw = self.collect(deferred=True)
        self.assertEqual(raw[str(self.project / 'app/covered.js')]['s'], {'0': 2, '1': 0})
        self.assertIn(str(self.project / 'app/unvisited.js'), raw)
        self.assertFalse((self.project / 'coverage/component/lcov.info').exists(),
                         'deferred collection must not regenerate a report after every spec')

    def test_local_default_keeps_immediate_reporting(self):
        self.collect(deferred=False)
        report = (self.project / 'coverage/component/lcov.info').read_text()
        self.assertIn('DA:1,2', report)
        self.assertIn('DA:2,0', report)
        self.assertIn('SF:app/unvisited.js', report)

    def test_final_render_is_identical_to_original_reporting(self):
        original_raw = self.collect(deferred=False)
        original_report = (self.project / 'coverage/component/lcov.info').read_text()
        shutil.rmtree(self.project / '.nyc_output')
        shutil.rmtree(self.project / 'coverage')
        deferred_raw = self.collect(deferred=True)
        self.assertEqual(deferred_raw, original_raw, 'all counters and unvisited files must survive')
        result = subprocess.run(['npm', 'run', 'coverage:component'], cwd=self.project,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.project / 'coverage/component/lcov.info').read_text(), original_report)
        self.assertTrue((self.project / 'coverage/component/index.html').is_file())


if __name__ == '__main__':
    unittest.main()
