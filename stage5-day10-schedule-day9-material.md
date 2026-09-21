# Day10日時決定・Day9/Day10 YouTube素材制作(Stage 5・2026-09-21)

## Day10 Instagram / TikTok 投稿日時決定

- `decide-schedule.js`を実装。投稿間隔(直近投稿からの経過時間)・曜日・プロジェクト標準の投稿枠(朝6:30/昼12:15/夜19:30)を考慮し、サンプル不足の現状を踏まえて時間帯は断定せず「検証用候補」として決定。
- **Instagram**：2026-09-22(火) 19:30 JST(当初計画の夜枠を踏襲)
- **TikTok**：2026-09-22(火) 12:15 JST(サンプル不足のため、IGとは意図的に異なる時間帯で検証)
- 決定理由は`scheduling_reason`(jsonb)としてSupabaseへ保存(投稿間隔・曜日・時間帯・仮説検証段階である旨を記録)
- `classify-readiness.js`で`ready_candidate`化 → `promote-to-ready.js`で`ready`昇格(重複チェック含め成功)
- GitHub Actions dry-runで両方とも`dry_run_ok`として検知されることを確認済み

## Day9 / Day10 YouTube 素材制作方法の再確認と実施

前回「実機撮影が必要」としていたが誤りだったため訂正し、以下を実施：

1. **キリドリ公開版(`https://kiridori.gbapp.workers.dev`)を実際に操作**し、PDF/Excel出力の一連の流れをスクリーンショットで取得(操作前・PDF操作・PDF完了・Excel操作・Excel完了)
2. Claude Browserツールの`save_to_disk`が実際にはファイルを保存しない仕様だったため、`puppeteer-core`＋既存のMicrosoft Edgeを直接操作する方式に切り替え、確実にファイルとして取得
3. ffmpegでテロップ・軽いズーム(Ken Burns)を付けた短尺動画を合成

## 作成したファイル

| ファイル | 内容 |
|---|---|
| `SNS集客/素材_v1/投稿5_PDF_Excel出力_v1.mp4` | Day9用。キリドリの実画面操作(PDF/Excel出力)を6シーンのスライド構成で紹介 |
| `SNS集客/素材_v1/投稿6_参加型テスター募集_v1.mp4` | Day10 YouTube用。既存の投稿6画像を9:16へパディングし、ゆっくりズーム+末尾テロップ |
| `SNS集客/素材_v1/day9_capture/` | 元スクリーンショット・ハイライト画像(素材の正本として保存) |
| `SNS集客/エンジン/capture-kiridori.js` | 撮影スクリプト(再利用可能) |
| `SNS集客/エンジン/build-day9-video.sh` / `build-day10-video.sh` | 動画合成スクリプト(再利用可能) |

## 動画の長さ・使用素材

| | 長さ | 使用素材 |
|---|---|---|
| 投稿5(Day9) | 8.5秒 | キリドリ公開版の実画面スクリーンショット5枚(操作前→PDF操作→PDF完了→Excel操作→Excel完了) |
| 投稿6(Day10 YouTube) | 7.0秒 | 既存の`投稿6_一番面倒なのはどれ.png`(1080×1350)をパディング・ズーム |

両方とも9:16(1080×1920)、実際のアプリ画面のみを使用(誇張・虚偽表現なし、未公開機能は含めていない)。

## 公開URL

- Day9：https://sns-material-storage.gbapp.workers.dev/day9-1.mp4
- Day10 YouTube：https://sns-material-storage.gbapp.workers.dev/day10-youtube.mp4

いずれもブラウザで実際に再生できることを確認済み。

## Supabase反映・readiness再分類

- `legacy-主要5`(Day9)のinstagram/tiktok/youtube 3行、`legacy-主要6`(Day10)のyoutube 1行、それぞれ`media_urls`を更新
- `classify-readiness.js`再実行 → **`waiting_media`は0件に。4件とも`waiting_schedule`(素材・内容は揃い、日時決定待ち)へ前進**

## readiness_state まとめ(再評価後)

| テーマ／媒体 | readiness_state |
|---|---|
| Day9(legacy-主要5) instagram | waiting_schedule |
| Day9(legacy-主要5) tiktok | waiting_schedule |
| Day9(legacy-主要5) youtube | waiting_schedule |
| Day10(legacy-主要6) youtube | waiting_schedule |
| Day10(legacy-主要6) instagram / tiktok | (今回対象外。既にready、変更していない) |

**readyへ進められるか**：内容・素材・公開可否はすべて揃っているため、投稿日時を決定して`promote-to-ready.js`を実行すれば`ready`へ進められる状態。今回は指示どおりDay10 IG/TikTokの状態は変更せず、日時決定はここでは行っていない。

## 変更していないもの

- Day10 Instagram / TikTokの予約日時・ready状態：変更なし
- GitHub Actionsのlive投稿：引き続き無効
