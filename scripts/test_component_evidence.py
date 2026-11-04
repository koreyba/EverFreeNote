"""Real filesystem interleavings at the evidence copy boundary."""

import os
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock

from scripts.component_evidence import copy_path, EvidenceCopyError


class ComponentEvidenceTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='efn-evidence-copy-')
        self.addCleanup(directory.cleanup)
        self.project = Path(directory.name).resolve()
        self.source = self.project / 'source'
        self.source.mkdir()
        self.output = self.project / 'output'

    def test_nested_binary_content_and_identical_files_survive_copy(self):
        nested = self.source / 'nested'
        nested.mkdir()
        content = bytes(range(256)) * 8193
        (nested / 'attachment.bin').write_bytes(content)
        (nested / 'attachment.bin').chmod(0o600)
        copy_path(self.source, self.output)
        copy_path(self.source, self.output)
        self.assertEqual((self.output / 'nested/attachment.bin').read_bytes(), content)
        self.assertEqual((self.output / 'nested/attachment.bin').stat().st_mode & 0o777, 0o600,
                         'copying diagnostic data must not broaden access or add executable bits')

    def test_world_writable_source_does_not_make_writable_artifacts(self):
        source = self.source / 'attachment.txt'
        source.write_text('runner evidence')
        # Simulate permissive source metadata without making the fixture writable.
        mode = stat.S_IFREG | stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO
        previous = os.umask(0)
        try:
            with mock.patch('os.fstat', return_value=SimpleNamespace(st_mode=mode)):
                copy_path(source, self.output)
        finally:
            os.umask(previous)
        self.assertEqual(self.output.read_text(), 'runner evidence')
        self.assertEqual(self.output.stat().st_mode & 0o777, 0o644)

    def test_conflicting_existing_file_is_preserved(self):
        source = self.source / 'attachment.txt'
        source.write_text('new evidence')
        destination = self.project / 'existing.txt'
        destination.write_text('original evidence')
        with self.assertRaisesRegex(EvidenceCopyError, 'Conflicting'):
            copy_path(source, destination)
        self.assertEqual(destination.read_text(), 'original evidence')

    def test_source_symlink_is_rejected(self):
        outside = self.project / 'outside.txt'
        outside.write_text('outside content')
        source = self.source / 'attachment.txt'
        source.symlink_to(outside)
        with self.assertRaisesRegex(EvidenceCopyError, 'Symlink'):
            copy_path(source, self.output)
        self.assertFalse(self.output.exists())

    def test_destination_symlink_is_rejected_without_changing_target(self):
        source = self.source / 'attachment.txt'
        source.write_text('details')
        outside = self.project / 'outside.txt'
        outside.write_text('details')
        self.output.symlink_to(outside)
        with self.assertRaisesRegex(EvidenceCopyError, 'Symlink'):
            copy_path(source, self.output)
        self.assertEqual(outside.read_text(), 'details')

    def test_source_file_swap_after_stat_reads_the_opened_file(self):
        source = self.source / 'attachment.txt'
        source.write_text('original attachment')
        outside = self.project / 'outside.txt'
        outside.write_text('outside content must not enter the report')
        identity = source.stat()
        original = os.fstat
        swapped = False

        def interleave(descriptor):
            nonlocal swapped
            result = original(descriptor)
            if not swapped and (result.st_dev, result.st_ino) == (identity.st_dev, identity.st_ino):
                swapped = True
                source.rename(source.with_suffix('.snapshot'))
                source.symlink_to(outside)
            return result

        with mock.patch('os.fstat', side_effect=interleave):
            copy_path(source, self.output)
        self.assertTrue(swapped, 'exercise the actual inspection/read interleaving')
        self.assertEqual(self.output.read_text(), 'original attachment')

    def test_source_directory_swap_after_stat_reads_the_opened_tree(self):
        (self.source / 'log.txt').write_text('original runner log')
        outside = self.project / 'outside'
        outside.mkdir()
        (outside / 'log.txt').write_text('outside tree must not enter the report')
        identity = self.source.stat()
        original = os.fstat
        swapped = False

        def interleave(descriptor):
            nonlocal swapped
            result = original(descriptor)
            if not swapped and (result.st_dev, result.st_ino) == (identity.st_dev, identity.st_ino):
                swapped = True
                self.source.rename(self.source.with_suffix('.snapshot'))
                self.source.symlink_to(outside, target_is_directory=True)
            return result

        with mock.patch('os.fstat', side_effect=interleave):
            copy_path(self.source, self.output)
        self.assertTrue(swapped, 'exercise directory replacement after inspection')
        self.assertEqual((self.output / 'log.txt').read_text(), 'original runner log')

    def test_concurrent_destination_creation_is_not_overwritten(self):
        source = self.source / 'attachment.txt'
        source.write_text('new evidence')
        original = os.open
        created = False

        def interleave(file, flags, *args, **kwargs):
            nonlocal created
            if not created and str(file) == self.output.name and flags & os.O_CREAT:
                created = True
                self.output.write_text('concurrent evidence')
            return original(file, flags, *args, **kwargs)

        with mock.patch('os.open', side_effect=interleave), \
                self.assertRaisesRegex(EvidenceCopyError, 'Conflicting'):
            copy_path(source, self.output)
        self.assertTrue(created, 'create the competing file just before exclusive open')
        self.assertEqual(self.output.read_text(), 'concurrent evidence')

    def test_symlink_in_source_parent_is_rejected(self):
        outside = self.project / 'outside'
        outside.mkdir()
        (outside / 'attachment.txt').write_text('outside content')
        link = self.source / 'linked'
        link.symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(EvidenceCopyError, 'Symlink'):
            copy_path(link / 'attachment.txt', self.output)
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
