# stage28｜素材待ち48件の制作バッチ1（3件・2026-09-27）

対応：Claude Code（編集長）。対象：`stage27`で本文を確定した48件のうち、日付が近い3件（Instagram 1・YouTube Shorts 1・TikTok 1）。

## 前提の確認

- アプリの現行版はSept作業時から進んでいた：キリドリ`kiridori_v65.html`（前回はv60）、ハリナビ`harinavi_v57.html`（前回はV26.09.062）。両方とも`02_作業中`直下の最新ファイルを直接読み込んで使用（引継ぎZIPや旧版は使わない）。
- キリドリv65は刃幅・データ読み込み(Excel/PDF/OCR)・並び替え方式・プラン保存/フォルダ管理が追加されていた。ハリナビv57は文書番号/日付(`docNo`/`docDate`)・支持条件セレクタ(`supportSeg`)・4項目の個別照査(曲げ応力/たわみ/トロリー走行レール/せん断)・参考最大荷重ボックスなどが追加されていた。ChatGPTの新しい話題（刃幅・支持条件・複数の照査項目・版管理など）は、これら現行版の実機能でそのまま示せることを確認した。

## 実施

### 1. 実画面の再取得（`assets/issue5/media2/capture-source-v2.cjs`）

現行版から17枚のクロップ画像を新規取得（`assets/issue5/media2/source/`）。既存の`assets/issue5/video/source/`（v60・V26.09.062時点）は変更していない。

- キリドリ：条件（定尺6,000mm・刃幅5mm）、データ読み込みカード、並び替えカード、部材リスト、結果サマリー、1本目・2本目の切り出し、プラン保存フォーム
- ハリナビ：ヘッダー（バージョン・日付）、スパン長（3,000mm）、吊り荷（2t）、支持条件（単純支持）、判定バナー、照査①③④（曲げ応力・トロリー・せん断）、参考最大荷重ボックス
- Chromeで描画（Edgeはこの端末で更新待ちのためheadless起動が失敗する。表示は同一）。

### 2. Instagram 1件：`45d435f2`（10/4 ハリナビ）

`assets/issue5/instagram/build_carousels_v2.py`（既存`build_carousels.py`の関数を再利用、既存のPOSTS/画像は変更せず新規5枚を`-v2`で書き出し）。

方向性どおり、1枚目「結果を見る前に、条件はそろってる？」→2〜4枚目に吊り荷・スパン・支持条件の実画面→5枚目「前提→結果の順で確認・最終判断は専門家へ」。

### 3. 動画2本：`e10de7e7`（10/2 YouTube kiridori）・`683ebc74`（10/3 TikTok harinavi）

`assets/issue5/media2/`に`narration-batch2.json`・`render-videos-batch2.cjs`・`render-narrated-videos-batch2.py`を新規作成（既存の`video/`一式は変更しない）。VOICEVOX Nemo 0.24.0（女声1・ノーマル、speaker 10005）をローカル起動して読み上げを合成、Chromeで画面を描画、ffmpegで合成。

- 両本とも全場面が予定秒数に収まった（話速1.07〜1.18、既存範囲内）。長さ28秒・26秒、720×1280、H.264+AAC、平均音量-17.3/-18.0dB・最大-1.3/-1.5dB（既存動画と同水準）。
- コマ単位で目視確認：実画面が正しいラベルで表示され、画面上部はアプリ名のみ（日付・媒体名表示なし、9/26の方針を踏襲）。

### 4. 公開配置とDB反映

`upload-to-public-url.js`で7ファイル（IG5枚・動画2本）を`sns-material-storage`へ配置。全件HTTP 200・正しいContent-Typeを確認。

`apply-20260927-batch2-media.js`で、対象3件（`status=draft`・`readiness_state=waiting_media`・未投稿・`media_urls`未設定）だけに絞って`media_urls`を登録し、`readiness_state`を`waiting_media`→`needs_review`へ進めた（`classify-readiness.js`と同じ判定基準）。`is_publishable`・`feature_published`・本文・予定日時は変更していない（ready化・投稿はしていない）。

## 対象外・残作業

- 残り45件（Instagram 17・TikTok 14・YouTube Shorts 14）は`waiting_media`のまま。同じ手順（`capture-source-v2.cjs`のクロップを使い回し、投稿ごとに新しい`build_*_v2.py`／`narration-batch*.json`＋`render-videos-batch*.cjs`を追加）で継続する。
- 今回追加した`media2/`一式は、投稿ごとに使う実画面クロップの組み合わせが変わるだけで、`capture-source-v2.cjs`は使い回せる。
