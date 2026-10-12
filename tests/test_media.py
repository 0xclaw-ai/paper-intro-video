"""Regression tests for the Python tools: clip placement, non-destructive media preparation, the generated
voice file, the encoded-frame audit, the 720p copy and the sound bed.

Run with the film's Python (av, numpy, pillow and scipy): python tests/test_media.py
No source footage, model download or ffmpeg is needed; conversion is stubbed at the subprocess boundary,
and the test videos are a few synthetic frames.
"""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import wave
import av
import numpy as np

TOOLS = Path(__file__).resolve().parents[1] / 'skills/paper-intro-video/template/tools'


def load(name):
    spec = importlib.util.spec_from_file_location(name, TOOLS / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


clip = load('clip_audio')
prep = load('prep_media')
narration = load('narration')
audit = load('audit_video')
transcode = load('transcode')
music = load('music')
mux = load('mux')


def write_video(path, frames, lossless=False):
    """grey frames (H x W uint8 arrays) -> an H.264 MP4 at 30 fps"""
    box = av.open(str(path), 'w')
    stream = box.add_stream('libx264', rate=30)
    stream.height, stream.width = frames[0].shape
    stream.pix_fmt = 'yuv420p'
    if lossless:
        stream.options = {'qp': '0'}
    for a in frames:
        for packet in stream.encode(av.VideoFrame.from_ndarray(np.repeat(a[..., None], 3, axis=2), format='rgb24')):
            box.mux(packet)
    for packet in stream.encode(None):
        box.mux(packet)
    box.close()


def run_main(module, argv):
    """a tool's main() with these arguments: (exit code, stdout)"""
    out, code = io.StringIO(), 0
    with patch('sys.argv', argv), contextlib.redirect_stdout(out):
        try:
            module.main()
        except SystemExit as e:
            code = e.code or 0
    return code, out.getvalue()


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


class VoiceFileTests(unittest.TestCase):
    def test_a_quoted_word_keeps_the_file_valid(self):
        data = {'cut': 'full', 'name': 'af_heart', 'cues': {
            's-a/one': {'say': 'We call it "s-shaped".', 'len': 1.2, 'w': [0.1, 0.3, 0.5, 0.7]},
            's-b/two': {'say': 'Then it stops.', 'len': 0.9, 'w': [0.1, 0.4, 0.6]}}}
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'voice.js'
            narration.js_file(str(path), 'OXVOICE', 'test', data)
            body = path.read_text(encoding='utf-8').split('const V = ', 1)[1].split(';\n  if (typeof module', 1)[0]
        self.assertEqual(json.loads(body), data)


class AuditVideoTests(unittest.TestCase):
    def test_finds_a_one_pixel_seam_and_a_blank_frame(self):
        ramp = np.repeat(np.linspace(30, 220, 180).astype(np.uint8)[:, None], 320, axis=1)
        seam = ramp.copy()
        seam[:, 100] = np.clip(seam[:, 100].astype(int) + 24, 0, 255)
        with tempfile.TemporaryDirectory() as d:
            video, report = Path(d) / 'film.mp4', Path(d) / 'audit.json'
            write_video(video, [seam, np.full((180, 320), 128, np.uint8), ramp], lossless=True)
            code, _ = run_main(audit, ['audit_video.py', str(video), '--json', str(report)])
            found = json.loads(report.read_text())['found']
        self.assertEqual(code, 1)
        seams = [f for f in found if f['kind'] == 'seam']
        self.assertEqual([(f['frame'], f['where']) for f in seams], [(0, 'vertical')])
        self.assertIn(100, [x for x, _ in seams[0]['lines']])
        self.assertEqual([f['frame'] for f in found if f['kind'] == 'flat'], [1])


class TranscodeTests(unittest.TestCase):
    def test_default_copy_is_720p_beside_the_master(self):
        frame = np.repeat(np.linspace(0, 255, 1920).astype(np.uint8)[None, :], 1080, axis=0)
        with tempfile.TemporaryDirectory() as d:
            src = Path(d) / 'film.mp4'
            write_video(src, [frame, frame])
            code, _ = run_main(transcode, ['transcode.py', str(src)])
            self.assertEqual(code, 0)
            with av.open(str(Path(d) / 'film_720p.mp4')) as box:
                cc = box.streams.video[0].codec_context
                self.assertEqual((cc.width, cc.height), (1280, 720))


class MuxTests(unittest.TestCase):
    def test_reports_how_far_the_voice_sits_above_the_bed(self):
        sr = mux.SR
        t = np.arange(3 * sr) / sr

        def wav(path, x):
            pcm = (np.repeat(x[:, None], 2, axis=1) * 32767).astype('<i2')
            with wave.open(str(path), 'wb') as w:
                w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())

        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            write_video(d / 'film.mp4', [np.full((64, 64), 128, np.uint8)] * 90)
            wav(d / 'bed.wav', 10 ** (-27 / 20) * np.sin(2 * np.pi * 220 * t))                         # -30 dBFS rms
            wav(d / 'voice.wav', np.where((t > 0.5) & (t < 2.5), 10 ** (-17 / 20) * np.sin(2 * np.pi * 440 * t), 0))   # -20 dBFS rms
            (d / 'voice.json').write_text(json.dumps({'cues': [{'start': 0.5, 'end': 2.5}]}))
            code, out = run_main(mux, ['mux.py', '--video', str(d / 'film.mp4'), '--out', str(d / 'out.mp4'),
                                       '--audio', f'{d / "bed.wav"},-3', '--audio', f'{d / "voice.wav"},0', '--duck', f'{d / "voice.json"},-8'])
        self.assertEqual(code, 0)
        gap = float(out.split('voice ')[1].split(' dB above the bed')[0])
        self.assertAlmostEqual(gap, -20 - (-30 - 3 - 8), delta=1.5)                       # the voice -20, the bed -30 - 3 - 8


class SoundBedTests(unittest.TestCase):
    timing = {'duration': 12.0, 'beat': 0.6, 'scenes': [{'id': 's-a', 'start': 0.0, 'dur': 6.0}, {'id': 's-b', 'start': 6.0, 'dur': 6.0}],
              'cues': [{'scene': 's-a', 'end': 4.0}, {'scene': 's-b', 'end': 10.8}]}

    def ears(self, bed, hz):
        """the level at hz in the left and the right ear, from 2 s to 10 s"""
        x = bed[2 * music.SR:10 * music.SR]
        spectrum = np.abs(np.fft.rfft(x * np.hanning(len(x))[:, None], axis=0))
        band = np.abs(np.fft.rfftfreq(len(x), 1 / music.SR) - hz) < 3
        return [20 * np.log10(spectrum[band, ear].max() + 1e-12) for ear in (0, 1)]

    def test_the_default_bed_is_a_piano_for_both_ears(self):
        bed, _ = music.build(self.timing, {'events': []}, sfx_on=False)
        np.testing.assert_array_equal(bed, music.build(self.timing, {'events': []}, sfx_on=False)[0])
        self.assertGreater(np.abs(bed).max(), 0.01)
        left, right = self.ears(bed, 200)
        self.assertLess(abs(left - right), 20)
        rms = np.sqrt((bed ** 2).mean(axis=0))
        self.assertLess(abs(20 * np.log10(rms[0] / rms[1])), 0.5)        # as loud on the left as on the right

    def test_a_short_film_without_speech_has_no_invalid_samples(self):
        for duration in (0.1, 1.0):
            with self.subTest(duration=duration), np.errstate(invalid='raise', divide='raise'):
                timing = {'duration': duration, 'beat': 0.6,
                          'scenes': [{'id': 'brief', 'start': 0, 'dur': duration}], 'cues': []}
                bed = music.piano(timing)
                self.assertEqual(bed.shape, (int(duration * music.SR), 2))
                self.assertTrue(np.isfinite(music.master(bed, -20)).all())
                if duration >= 1.0:
                    self.assertGreater(np.abs(bed).max(), 0.01)

    def test_the_binaural_bed_keeps_200_hz_in_the_left_ear(self):
        bed, _ = music.build(self.timing, {'events': []}, sfx_on=False, bed='binaural')
        left, right = self.ears(bed, 200)
        self.assertGreater(left - right, 30)


if __name__ == '__main__':
    unittest.main()
