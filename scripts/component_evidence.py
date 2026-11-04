"""Copy CI evidence through POSIX file descriptors without following symlinks."""

from contextlib import contextmanager
import errno
import json
import os
from pathlib import Path
import shutil
import stat
import sys


CHUNK_SIZE = 1024 * 1024


class EvidenceCopyError(Exception):
    pass


def open_no_follow(name, flags, *, parent=None):
    try:
        return os.open(name, flags | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
    except OSError as error:
        if error.errno in (errno.ELOOP, errno.ENOTDIR):
            raise EvidenceCopyError(f'Symlink or non-directory in evidence path: {name}') from error
        raise


@contextmanager
def parent_handle(path, *, create=False):
    parts = Path(path).parts
    if not parts or '..' in parts:
        raise EvidenceCopyError('Evidence paths must not contain parent traversal')
    absolute = Path(path).is_absolute()
    components = parts[1:] if absolute else parts
    if not components:
        raise EvidenceCopyError('An evidence entry is required')
    descriptor = open_no_follow('/' if absolute else '.', os.O_RDONLY | os.O_DIRECTORY)
    try:
        for name in components[:-1]:
            if create:
                try:
                    os.mkdir(name, dir_fd=descriptor)
                except FileExistsError:
                    pass
            child = open_no_follow(name, os.O_RDONLY | os.O_DIRECTORY, parent=descriptor)
            os.close(descriptor)
            descriptor = child
        yield descriptor, components[-1]
    finally:
        os.close(descriptor)


def copy_regular(source, destination, name, parent):
    try:
        target = open_no_follow(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, parent=parent)
    except FileExistsError:
        target = open_no_follow(name, os.O_RDONLY, parent=parent)
        try:
            if not stat.S_ISREG(os.fstat(target).st_mode):
                raise EvidenceCopyError(f'Unsupported evidence destination: {destination}')
            with os.fdopen(source, 'rb', closefd=False) as original, os.fdopen(target, 'rb', closefd=False) as existing:
                while True:
                    left, right = original.read(CHUNK_SIZE), existing.read(CHUNK_SIZE)
                    if left != right:
                        raise EvidenceCopyError(f'Conflicting shard evidence file: {destination}')
                    if not left:
                        return
        finally:
            os.close(target)
    else:
        try:
            with os.fdopen(source, 'rb', closefd=False) as original, os.fdopen(target, 'wb', closefd=False) as output:
                shutil.copyfileobj(original, output, length=CHUNK_SIZE)
        finally:
            os.close(target)


def copy_entry(source_name, destination_name, source_parent, destination_parent, destination):
    source = open_no_follow(source_name, os.O_RDONLY, parent=source_parent)
    try:
        mode = os.fstat(source).st_mode
        if stat.S_ISREG(mode):
            copy_regular(source, destination, destination_name, destination_parent)
        elif stat.S_ISDIR(mode):
            try:
                os.mkdir(destination_name, dir_fd=destination_parent)
            except FileExistsError:
                pass
            target = open_no_follow(destination_name, os.O_RDONLY | os.O_DIRECTORY, parent=destination_parent)
            try:
                # Directory-relative opens keep this traversal attached to the
                # inspected inode, even if an entry is renamed or substituted.
                for name in sorted(os.listdir(source)):
                    copy_entry(name, name, source, target, str(Path(destination) / name))
            finally:
                os.close(target)
        else:
            raise EvidenceCopyError(f'Unsupported evidence source: {source_name}')
    finally:
        os.close(source)


def copy_path(source, destination):
    if os.name != 'posix' or not hasattr(os, 'O_NOFOLLOW'):
        raise EvidenceCopyError('Secure evidence copying requires POSIX descriptor APIs')
    with parent_handle(source) as (source_parent, source_name):
        with parent_handle(destination, create=True) as (destination_parent, destination_name):
            copy_entry(source_name, destination_name, source_parent, destination_parent, str(destination))


def main():
    try:
        operations = json.load(sys.stdin)
        if not isinstance(operations, list) or any(
            not isinstance(item, dict) or not isinstance(item.get('source'), str)
            or not isinstance(item.get('destination'), str) for item in operations
        ):
            raise EvidenceCopyError('Expected a list of source/destination copies')
        for operation in operations:
            copy_path(operation['source'], operation['destination'])
        return 0
    except (OSError, ValueError, EvidenceCopyError) as error:
        print(error, file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
