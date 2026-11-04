"""Behavioral CLI contracts for complete component spec sharding."""

import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/component-shards.js'
SHA = 'a' * 40


class ComponentShardTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='efn-component-shards-')
        self.addCleanup(directory.cleanup)
        self.project = Path(directory.name).resolve()
        folder = self.project / 'cypress/component'
        folder.mkdir(parents=True)
        self.specs = [f'cypress/component/spec-{i}.cy.tsx' for i in range(8)]
        for name in self.specs:
            (self.project / name).write_text('describe("fixture", () => {});\n')
        (folder / 'support.ts').write_text('// not a spec\n')
        self.weights = dict(zip(self.specs, [40, 40, 30, 30, 20, 20, 10, 10]))
        (self.project / 'weights.json').write_text(json.dumps({'durationMs': self.weights}))

    def cli(self, *arguments, success=True):
        result = subprocess.run(['node', str(SCRIPT), *map(str, arguments)],
                                cwd=self.project, capture_output=True, text=True, timeout=30)
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, 'invalid or incomplete evidence must fail')
        return result

    def plan(self, shards=4):
        result = self.cli('plan', '--shards', shards, '--sha', SHA,
                          '--weights', 'weights.json', '--output', 'plan.json')
        plan = json.loads((self.project / 'plan.json').read_text())
        self.assertEqual(json.loads(result.stdout), plan)
        return plan

    def artifacts(self):
        plan = self.plan(shards=2)
        for shard in plan['shards']:
            index = shard['index']
            folder = self.project / f'inputs/shard-{index}'
            folder.mkdir(parents=True)
            self.cli('select', '--plan', 'plan.json', '--shard', index,
                     '--output', folder / 'component-shard.json')
            results = folder / 'allure-results/component'
            results.mkdir(parents=True)
            attachment = f'attachment-shard-{index}.txt'
            (results / attachment).write_text('details')
            (results / 'environment.properties').write_text(f'runner=shard-{index}\n')
            for number, spec in enumerate(shard['specs']):
                uuid = f'{index}-{number}'
                (results / f'{uuid}-result.json').write_text(json.dumps({
                    'uuid': uuid, 'name': 'case', 'status': 'passed',
                    'fullName': f'everfreenote:{spec}#case',
                    'attachments': [{'name': 'details', 'source': attachment, 'type': 'text/plain'}],
                }))
            raw = folder / '.nyc_output'
            raw.mkdir()
            source = str(self.project / 'app/shared.js')
            (raw / 'out.json').write_text(json.dumps({source: {
                'path': source, 'hash': 'same-source',
                'statementMap': {'0': {'start': {'line': 1, 'column': 0},
                                       'end': {'line': 1, 'column': 10}}},
                's': {'0': index}, 'fnMap': {}, 'f': {}, 'branchMap': {}, 'b': {},
            }}))
        return plan

    def merge(self, *, success=True):
        return self.cli('merge', '--plan', 'plan.json', '--input', 'inputs', '--output', 'out',
                        '--sha', SHA, '--coverage', 'true', success=success)

    def test_plan_covers_all_specs_once_and_balances_measured_work(self):
        plan = self.plan()
        selected = [spec for shard in plan['shards'] for spec in shard['specs']]
        self.assertCountEqual(selected, self.specs)
        self.assertEqual(len(selected), len(set(selected)))
        self.assertEqual(len(plan['shards']), 4)
        loads = [sum(self.weights[spec] for spec in shard['specs']) for shard in plan['shards']]
        self.assertEqual(max(loads), 50)
        self.assertEqual(self.plan(), plan, 'planning must be deterministic')

    def test_new_specs_are_included_without_empty_shards(self):
        new = 'cypress/component/new file.cy.js'
        (self.project / new).write_text('// new spec\n')
        plan = self.plan(shards=16)
        selected = [spec for shard in plan['shards'] for spec in shard['specs']]
        self.assertCountEqual(selected, self.specs + [new])
        self.assertTrue(all(shard['specs'] for shard in plan['shards']))
        self.assertTrue(all(shard['estimatedMs'] > 0 for shard in plan['shards']))

    def test_select_rejects_a_stale_plan(self):
        self.plan()
        (self.project / 'cypress/component/new.cy.ts').write_text('// new spec\n')
        result = self.cli('select', '--plan', 'plan.json', '--shard', 1,
                          '--output', 'component-shard.json', success=False)
        self.assertIn('spec discovery changed', result.stderr.lower())

    def test_invalid_timing_cannot_silently_remove_a_spec(self):
        self.weights[self.specs[0]] = -1
        (self.project / 'weights.json').write_text(json.dumps({'durationMs': self.weights}))
        result = self.cli('plan', '--shards', 4, '--sha', SHA, '--weights', 'weights.json',
                          '--output', 'plan.json', success=False)
        self.assertIn('duration', result.stderr.lower())

    def test_complete_merge_preserves_scope_attachments_and_coverage_union(self):
        self.artifacts()
        self.merge()
        output = self.project / 'out'
        results = output / 'allure-results/component'
        self.assertEqual(len(list(results.glob('*-result.json'))), 8)
        self.assertEqual((results / 'attachment-shard-2.txt').read_text(), 'details')
        self.assertTrue((output / 'cypress/results/shard-2/allure-metadata/environment.properties').exists())
        raw = json.loads((output / '.nyc_output/out.json').read_text())
        self.assertEqual(raw[str(self.project / 'app/shared.js')]['s'], {'0': 3})
        summary = json.loads((output / 'summary.json').read_text())
        self.assertEqual(summary['expectedSpecs'], summary['observedSpecs'])
        self.assertEqual(summary['observedSpecs'], 8)

    def test_missing_shard_fails_but_retains_available_evidence(self):
        self.artifacts()
        shutil.rmtree(self.project / 'inputs/shard-2')
        result = self.merge(success=False)
        self.assertIn('missing shard', result.stderr.lower())
        self.assertGreater(len(list((self.project / 'out/allure-results/component').glob('*-result.json'))), 0)

    def test_missing_coverage_cannot_publish_a_successful_union(self):
        self.artifacts()
        (self.project / 'inputs/shard-2/.nyc_output/out.json').unlink()
        self.assertIn('coverage', self.merge(success=False).stderr.lower())

    def test_foreign_observed_spec_is_rejected(self):
        self.artifacts()
        result_file = next((self.project / 'inputs/shard-1/allure-results/component').glob('*-result.json'))
        result = json.loads(result_file.read_text())
        result['fullName'] = 'everfreenote:cypress/component/foreign.cy.tsx#case'
        result_file.write_text(json.dumps(result))
        self.assertIn('unexpected observed spec', self.merge(success=False).stderr.lower())

    def test_planned_spec_with_no_observed_tests_is_rejected(self):
        self.artifacts()
        next((self.project / 'inputs/shard-1/allure-results/component').glob('*-result.json')).unlink()
        self.assertIn('missing observed spec', self.merge(success=False).stderr.lower())

    def test_duplicate_shard_fails_without_double_counting_coverage(self):
        self.artifacts()
        shutil.copytree(self.project / 'inputs/shard-1', self.project / 'inputs/duplicate')
        self.assertIn('duplicate shard', self.merge(success=False).stderr.lower())
        raw = json.loads((self.project / 'out/.nyc_output/out.json').read_text())
        self.assertEqual(raw[str(self.project / 'app/shared.js')]['s'], {'0': 3})

    def test_stale_artifact_sha_is_rejected(self):
        self.artifacts()
        meta = self.project / 'inputs/shard-1/component-shard.json'
        value = json.loads(meta.read_text())
        value['sha'] = 'b' * 40
        meta.write_text(json.dumps(value))
        self.assertIn('sha/version does not match', self.merge(success=False).stderr.lower())

    def test_concurrent_evidence_creation_cannot_be_overwritten(self):
        self.artifacts()
        hook = self.project / 'concurrent-copy.cjs'
        hook.write_text("""
const fs = require('node:fs');
const original = fs.copyFileSync;
let created = false;
fs.copyFileSync = (source, destination, ...options) => {
  if (!created && destination.endsWith('/allure-results/component/attachment-shard-1.txt')) {
    created = true;
    fs.writeFileSync(destination, 'concurrent evidence', { flag: 'wx' });
  }
  return original(source, destination, ...options);
};
""")
        result = subprocess.run(['node', '--require', str(hook), str(SCRIPT), 'merge',
                                 '--plan', 'plan.json', '--input', 'inputs', '--output', 'out',
                                 '--sha', SHA, '--coverage', 'true'],
                                cwd=self.project, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0, 'conflicting concurrent evidence must fail')
        self.assertIn('conflicting shard evidence', result.stderr.lower())
        copied = self.project / 'out/allure-results/component/attachment-shard-1.txt'
        self.assertEqual(copied.read_text(), 'concurrent evidence')

    def test_latest_attempt_replaces_only_its_shard_without_erasing_old_evidence(self):
        self.artifacts()
        retry = self.project / 'inputs/retry'
        shutil.copytree(self.project / 'inputs/shard-1', retry)
        meta = json.loads((retry / 'component-shard.json').read_text())
        meta['attempt'] = 2
        (retry / 'component-shard.json').write_text(json.dumps(meta))
        coverage = json.loads((retry / '.nyc_output/out.json').read_text())
        coverage[str(self.project / 'app/shared.js')]['s']['0'] = 5
        (retry / '.nyc_output/out.json').write_text(json.dumps(coverage))
        self.merge()
        merged = json.loads((self.project / 'out/.nyc_output/out.json').read_text())
        self.assertEqual(merged[str(self.project / 'app/shared.js')]['s'], {'0': 7})
        self.assertTrue((self.project / 'inputs/shard-1/.nyc_output/out.json').exists())


if __name__ == '__main__':
    unittest.main()
