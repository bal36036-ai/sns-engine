# Issue #5｜動画8本の常時モーション・下部常時表示を削除

2026-09-24。[最新の修正指示](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5815904217)に対応。TikTok 4本・YouTube Shorts 4本を修正し、再確認待ちとした。

## 見る場所

- [修正後8本のリンク・投稿キー](assets/issue5/video/README.md)
- [冒頭と結末の一覧](assets/issue5/video/contact_sheet.jpg)／[全40場面の一覧](assets/issue5/video/scenes_review.jpg)。どちらも書き出したMP4から抽出。
- [クレジットを含む8件の投稿本文・概要欄](assets/issue5/video/publication-copy.md)／[JSON](assets/issue5/video/publication-copy.json)
- [ナレーション台本と秒割](assets/issue5/video/narration.json)／[自動検証結果](assets/issue5/video/verification.json)
- [変更前の音声付き8本](https://github.com/bal36036-ai/sns-engine/blob/6d6e3a0ac9e7531da79cce9e19309a56661d5d66/assets/issue5/video/README.md)

## 変更前後

| 対象 | 変更前 | 修正後 |
|---|---|---|
| 動き | 全40場面で常時ズーム・パン | 全場面を固定。2場面目以降の切り替え時に約0.16秒のフェードのみ |
| 下部 | ブランド名、例の注記、出典、音声クレジット、安全注意を常時表示 | 下部の常時表示領域を削除。実画面とテロップを主に表示 |
| 注目表示 | 全場面に注目ラベルと矢印 | 条件・数値を読む場面に維持。メモと締めの場面から削除 |
| 音声 | VOICEVOX Nemo 女声1・ノーマル（10005） | 同じ音声を再圧縮せず使用。BGM・効果音なし |
| 音声クレジット | 動画内に常時表示 | 8件すべての投稿文・概要欄原稿へ「音声：VOICEVOX Nemo」を追加 |
| ハリナビ安全注意 | 動画下部に常時表示 | 投稿文・概要欄で専門家による最終判断を説明。9/25 YouTubeに一文を追加、他3件は既存文を維持 |
| 数値が例である説明 | 動画下部に常時表示 | 全8件の投稿文側に維持。説明用メモにはその場面の短い注記のみ |

実アプリ画面内に元から含まれる注意文は、画面の一部として維持している。ナレーション内の「一次照査の補助」も維持。計算条件・数値・台本・音声のタイミングは変えていない。

## 投稿文の扱い

`publication-copy.md` / `publication-copy.json` は今回の動画と組み合わせる最終確認用原稿。TikTokはキャプション、YouTube Shortsは概要欄へ記載する。元の `first-week-content.js` にある本文から生成し、追加は音声クレジットと必要な安全注意に限定した。**DB・Buffer・SNSへの反映は行っていない。** 承認後の登録時にはこの原稿と動画をセットで使う。

[VOICEVOX Nemo利用規約](https://voicevox.hiroshiba.jp/nemo/term/)でクレジットの必要性を確認。[公式Q&A](https://voicevox.hiroshiba.jp/qa/)では動画の概要欄または動画内へのクレジット記載を案内している（2026-09-24確認）。

## 確認結果

- 関連検証コマンド：`node assets/issue5/verify-media.cjs --video-only --audio-baseline=6d6e3a0 --report=assets/issue5/video/verification.json` 成功。
- 8本すべて720×1280、24fps、H.264映像・AAC音声、26〜29秒。台本の場面秒数と動画長が一致。
- 全40場面で、場面開始0.5秒後と終了0.5秒前の映像を比較。画面が静止していることを確認。平均画素差の最大値は0.081未満（0〜255の色値）。
- 全40場面の下端に文字がなく、背景が続くことを映像から検証。動画から抽出した全場面の一覧と、結果画面の拡大表示も目視確認した。
- 音声8本の圧縮済みデータの照合値が変更前のコミットと全件一致。音声のデコード、非無音、台本との長さの整合も成功。聴感による自然さの最終確認は引き続きユーザーレビュー待ち。
- 投稿原稿8件のクレジットが各1回であること、元本文を保持していること、ハリナビ4件に専門家による最終判断の記載があることを検証。
- 無音版8本、Instagram画像、実画面の撮影元、ナレーション台本は変更なし。

## 変更範囲・運用状態

変更は `assets/issue5/video/` の制作処理・素材・原稿・記録、`assets/issue5/verify-media.cjs` と本報告のみ。既存のStage 14以前の報告は当時の記録として保持する。

DBへの接続・書き込み、ready化、予約、投稿、Buffer登録、素材URL登録は実行していない。`status` / `readiness_state` / `scheduled_at` / `is_publishable` / `feature_published` を更新する処理も実行していない。カレンダー、sns-dashboard、cron、Buffer、Threadsの本番経路は変更なし。

次は8本と投稿原稿の再確認。Issue #5は開いたままにし、公開承認前の状態で止める。
