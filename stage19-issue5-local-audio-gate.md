# Issue #5｜ローカル音声検証と10月3日の動画

2026-09-25。[運用変更](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5822906199)と[音声検証の指示](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5823012270)に従う。人の試聴は制作の必須条件とせず、動画ごとに機械検証を記録する。

## 追加したもの

- [音声検証処理](scripts/check-video-audio.py)、[専門用語辞書](scripts/audio_terms.json)、[依存関係](scripts/requirements-audio.txt)、[判定テスト](scripts/test-check-video-audio.py)
- [10/1・10/2の結果](scripts/audio-check-report.json)、[10/3の結果](scripts/audio-check-20261003.json)
- [10/3 TikTok動画](assets/issue5/future/20261003/20261003-tiktok-harinavi-narrated.mp4)、[5場面の一覧](assets/issue5/future/20261003/preview.jpg)、[投稿文](assets/issue5/future/20261003/publication-copy.md)、[再制作処理](assets/issue5/future/20261003/render_narrated.py)

検証環境：Python 3.13.15、FFmpeg 9.0.1、faster-whisper 1.2.1、CTranslate2 4.8.2、`small`日本語モデル、CPU int8。モデルは初回に公開モデルを取得し、音声の解析はPC内で実行。外部の音声解析APIや課金APIは使用していない。VOICEVOX Nemo 0.24.0は10/3動画の音声合成にローカルで使用した。

実行方法：`python -m pip install -r scripts/requirements-audio.txt` の後、例えば `python scripts/check-video-audio.py assets/issue5/future/20261003/20261003-tiktok-harinavi-narrated.mp4 --report scripts/audio-check-20261003.json`。動画の台本と場面秒数は、初週分では既存の `narration.json`、10月分では同じフォルダの `render_narrated.py` から読み取る。新規の公開・投稿経路には接続しない。

10/3の再制作処理は、動画を書き出した直後に同じ検証処理を自動実行する。`FAIL` は実行を失敗として止め、`WARN` は結果を残して進める。以降の動画制作もこの呼び出しを使う。

## 判定

- **PASS**：音声あり、動画長と秒割が一致、無音・音割れ・場面境界への到達がなく、文字起こしが台本と十分一致する。
- **WARN**：意味が変わらない文字起こしの表記ゆれや、確認語を与えると一致する用語。記録して制作は続ける。
- **FAIL**：音声がない、無音・音割れ・時間超過、数字や重要語の不一致、台本の主要部分の欠落が検出された場合。対象動画を確認・修正して再実行する。

機械判定は発音の自然さを保証しない。音声認識が専門語を別語に変換することがあるため、`FAIL` は実際の誤読と即断せず、音声エンジンの読み情報や元の台本を調べる。実画面の数値とテロップの照合は、音声検証に加えて場面画像で確認する。

## 実行結果

| 動画 | 判定 | 内容 |
|---|---|---|
| 10/1 TikTok ハリナビ | WARN | 音声・長さ・場面・音量は正常。「吊り荷二トン」の文字起こしが音に近いカタカナになり、「曲げ応力」は再認識で一致。 |
| 10/2 YouTube キリドリ | PASS | 音声・長さ・場面・音量・台本照合に問題なし。 |
| 10/3 TikTok ハリナビ | WARN | 音声・長さ・場面・音量は正常。「吊り荷」の文字起こしのみ音に近い表記。5場面の画像を目視確認し、実画面の条件 `3,000mm`・`2t`、結果項目、検討中という表現、専門家判断の注意を確認。 |

10/3動画は27秒、H.264 720×1280 24fps、AAC 48kHz。実画面は固定し、常時ズーム・パン、BGM、下部の常時表示はない。動画内で未実装の改善を完成済みと説明していない。ナレーションを人が聴いて評価した記録はない。

初週8本にも試験適用したところ、すべて専門語の文字起こしで `FAIL` となった。例：`定尺`→`定着`、`一次照査`→`一時調査`。この一括試験を音声の実際の誤読の証拠とは扱わず、正式な完成判定にも用いない。ローカルVOICEVOXの読み情報では「定尺」「吊り荷」「一次照査」「曲げ応力」の読みは台本の意図に沿っていた。初週8本の発音・自然さは未確定として残す。

10/1・10/2の動画は今回変更していない。10/3の投稿原稿・動画はGitHub上のレビュー用素材で、DBの `status`・`readiness_state`・`scheduled_at`・`is_publishable`・`feature_published`、素材URL、Buffer登録、SNS投稿、cron、Threadsは変更していない。予約もしていない。
