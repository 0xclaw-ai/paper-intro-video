"""Regression tests for clip placement and non-destructive media preparation.

Run with the film's Python (numpy required): python tests/test_media.py
No source footage, model download or ffmpeg is needed; conversion is stubbed at the subprocess boundary.
"""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import numpy as np

TOOLS = Path(__file__).resolve().parents[1] / 'skills/paper-intro-video/template/tools'


def load(name):
    spec = importlib.util.spec_from_file_location(name, TOOLS / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


clip = load('clip_audio')
prep = load('prep_media')


class ClipAudioTests(unittest.TestCase):
    def test_negative_start_trims_source_not_just_destination(self):
        out = np.zeros((4, 2))
        x = np.repeat(np.arange(6)[:, None], 2, axis=1)
        window = clip.place(out, x, -2 / clip.SR)
        np.testing.assert_array_equal(out[:, 0], [2, 3, 4, 5])
        self.assertIsNotNone(window)

    def test_tail_and_outside_clip(self):
        out = np.zeros((4, 2))
        clip.place(out, np.ones((6, 2)), 3 / clip.SR)
        np.testing.assert_array_equal(out[:, 0], [0, 0, 0, 1])
        self.assertIsNone(clip.place(out, np.ones((2, 2)), 10 / clip.SR))

    def test_nothing_plays_before_the_scene_mark(self):
        out = np.zeros((6, 2))
        x = np.repeat(np.arange(6)[:, None], 2, axis=1)
        clip.place(out, x, 0, start=3 / clip.SR)
        np.testing.assert_array_equal(out[:, 0], [0, 0, 0, 3, 4, 5])

    def test_overlaps_add_without_integer_wrap(self):
        out = np.zeros((4, 2))
        x = np.full((4, 2), 20000)
        clip.place(out, x, 0)
        clip.place(out, x, 0)
        np.testing.assert_array_equal(out, np.full((4, 2), 40000))


class MediaPrepTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'source.mp4').write_bytes(b'fixture')
        self.media = self.root / 'media'
        self.media.mkdir()
        (self.media / 'keep.txt').write_text('original')
        self.manifest = {'demo': ('source.mp4', 0, 1, '', 30, 3)}

    def invoke(self, args, convert):
        with patch.object(prep, 'ROOT', str(self.root)), patch.object(prep, 'OUT', str(self.media)), \
             patch.object(prep, 'CLIPS', self.manifest), patch.object(prep, 'SOUNDS', {}), \
             patch.object(prep, 'run', side_effect=convert), patch.object(prep.shutil, 'which', return_value='ffmpeg'), \
             patch('sys.argv', ['prep_media.py', *args]):
            prep.main()

    def test_existing_media_requires_explicit_replace(self):
        with self.assertRaisesRegex(SystemExit, 'already exists'):
            self.invoke([], lambda _: self.fail('must not convert'))
        self.assertEqual((self.media / 'keep.txt').read_text(), 'original')

    def test_failed_conversion_preserves_existing_media(self):
        def fail(_):
            raise subprocess.CalledProcessError(1, 'ffmpeg')
        with self.assertRaises(subprocess.CalledProcessError):
            self.invoke(['--replace'], fail)
        self.assertEqual((self.media / 'keep.txt').read_text(), 'original')
        self.assertEqual(list(self.root.glob('media.backup-*')), [])

    def test_replacement_keeps_backup_and_new_manifest(self):
        def convert(args):
            Path(args[-1].replace('%05d', '00001')).write_bytes(b'jpeg fixture')
        self.invoke(['--replace'], convert)
        backups = list(self.root.glob('media.backup-*'))
        self.assertEqual(len(backups), 1)
        self.assertEqual((backups[0] / 'keep.txt').read_text(), 'original')
        data = (self.media / 'manifest.js').read_text().split('=', 1)[1].strip().rstrip(';')
        self.assertEqual(json.loads(data)['demo']['frames'], 1)

    def test_path_traversal_name_rejected_before_writes(self):
        self.manifest = {'../escape': next(iter(self.manifest.values()))}
        with self.assertRaisesRegex(SystemExit, 'invalid clip name'):
            self.invoke(['--replace'], lambda _: self.fail('must not convert'))
        self.assertEqual((self.media / 'keep.txt').read_text(), 'original')

    def test_symlink_output_is_rejected(self):
        other = self.root / 'other'
        self.media.rename(other)
        self.media.symlink_to(other, target_is_directory=True)
        with self.assertRaisesRegex(SystemExit, 'symlink'):
            self.invoke(['--replace'], lambda _: self.fail('must not convert'))
        self.assertEqual((other / 'keep.txt').read_text(), 'original')


if __name__ == '__main__':
    unittest.main()
