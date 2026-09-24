"""Small tests for the classification rules, without loading a speech model."""

import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("audio_checker", Path(__file__).with_name("check-video-audio.py"))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class AudioCheckTests(unittest.TestCase):
    def test_identical_line_passes(self):
        self.assertEqual(checker.compare("スパン長三千ミリ", "スパン長3000ミリ")[0], "PASS")

    def test_number_change_fails(self):
        self.assertEqual(checker.compare("スパン長三千ミリ", "スパン長二千五百ミリ")[0], "FAIL")

    def test_phonetic_asr_spelling_is_warning(self):
        result = checker.compare("吊り荷二トンを入力", "ツリニニトーンを入力")
        self.assertEqual(result[0], "WARN")
        self.assertEqual(result[2], [])

    def test_missing_technical_term_fails(self):
        self.assertEqual(checker.compare("曲げ応力を確認します", "極限応力を確認します")[0], "FAIL")

    def test_phonetic_match_does_not_hide_missing_sentence(self):
        self.assertEqual(checker.compare("吊り荷二トンを入力し結果を確認します", "ツリニニトーン")[0], "FAIL")

    def test_silence_measurement(self):
        result = checker.measure([0] * 16000)
        self.assertEqual(result["active_seconds"], 0)
        self.assertIsNone(result["last_active_end"])


if __name__ == "__main__":
    unittest.main()
