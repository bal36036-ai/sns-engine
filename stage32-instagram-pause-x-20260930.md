# stage32｜Instagramを一時停止し、XをBuffer経由の自動投稿に（2026-10-01）

対応：Claude Code。ばるの判断：「1にしてみよう」（Instagramを止めてBufferの枠をXに替える）、「画像はあった方がいいんじゃないかな？」。

## 判断の根拠

Buffer（9/30更新）の実測：TikTok 7件で1,074回、YouTube Shorts 7件で644回、Instagram 10件で12回（リーチ9、いいね・保存0）。`instagram-metrics-20260930.md` に保存（Bufferの接続解除で、Buffer上の分析データは完全に削除されるため）。

## 実施

1. Instagram：準備完了21件を下書き・確認待ちへ戻した（`park-instagram.js`。本文・画像・日時・公開フラグは変更なし。再開は`--resume`）。`buffer-channels.js`で`PAUSED_SNS=["instagram"]`とし、投稿処理・昇格・カレンダーの対象から外した。
2. Buffer：ばるがInstagramのチャンネルを接続解除し、PCのChromeでX（@genba_apps）を接続。チャンネルID `6abd8087ea19ca0bde398054` を`buffer-channels.js`に登録（無料枠3チャンネル：TikTok・YouTube・X）。
3. コード：チャンネル定義を`buffer-channels.js`に集約し、`cron-engine.js`・`promote-to-ready.js`・`verify-before-ready.js`・`classify-readiness.js`・`maintain-calendar.js`・`reschedule-calendar.js`が参照。Xは文章だけでも投稿できる媒体（Threadsと同じ）。テスト7件は通過（Instagram停止・X接続に合わせて期待値を更新）。
4. Xの下書き27件に、毎日12:15・1日1件で10/1〜10/27の枠を割り当て（`schedule-x-drafts.js`。Xの文字数は上限280に対し最大189、禁止表現・重複なし）。確認待ち（needs_review）。
5. 画像：同じ話題のInstagram画像がある17件に、4枚を添えた（`attach-x-images.js`。キリドリ=1〜4枚目、ハリナビ=1〜3枚目＋最後の「最終判断は専門家」の1枚）。9月作成の4話題（9/24・9/28・9/29・9/30）の画像には日付が入っていたため、日付なしの版（`-nodate`、25枚）を作って差し替えた（`swap-x-nodate-images.js`）。全68枚が公開URLで到達可能。残り10件（同じ話題の画像なし）は文章のみ。

## 未了

- Xの27件は未承認。承認後に、`approve-20260926-first-batch.js`（ID指定）で準備完了にする。
- Xで最初の1件を実際に出す前に、`preflight-ready-post.js`で公開前確認（実投稿なし）を通す。
- Xの投稿に対する、Bufferでの画像4枚の受け入れは、実際の初回投稿で確認する。

## 追記：Xの27件を承認（2026-10-01 09:50）

- ばるの「大丈夫です」（27件の承認、画像なしの10件は後から足す）を受け、Xの27件をすべて準備完了（ready）に。Bufferで同じ本文の投稿がないことも照合（27件とも通過）。`approve-20260926-first-batch.js`は、Threadsに加えてXも文章だけで承認できるよう変更。
- 10/1 12:15の最初の1件（`7c39cdac`、キリドリ、画像4枚つき）を`preflight-ready-post.js`（実投稿なし）に通し、`dry_run_ok`（全チェック通過）。
- 実際の初回投稿は10/1 12:22ごろ（Supabaseからの合図）。画像4枚つきでXに出るかは、その結果で確認する。
- ready合計：Threads 約60・TikTok 約16・YouTube 約19・X 27（Instagramは一時停止）。

## 追記：Xの画像なし9件に専用の画像を作成（2026-10-02）

- ばる依頼「画像なしの10件にも画像を足して」。10件のうち 09bfa0d5 は10/2 12:15に文章のみで投稿済みのため対象外。残り9件（ready）に、本文に合わせた画像2〜4枚を作成（`assets/issue5/media2/spec-x.json`・`build_x_images.py`、出力 `media2/x/`、計24枚）。
- 実画面は media2/source の現行版の画面だけを使用。説明図・架空例には「説明図／画面表示ではありません」を表示。PDF/Excel出力の画面は存在しないため、画面は使わず説明図のみ。日付は入れていない。矢印のない「選択肢」の図を追加（順番や変換に見えないように）。
- 公開URL（`issue5-x-<ID先頭8桁>-0N.png`）へ上げ、ハッシュ一致を確認。`attach-x-own-images.js`で `media_urls` を設定。3件を公開前確認（実投稿なし）に通し、全項目合格。
- 未了：10/28〜11/1のX下書き5件（`画面を見直すメモ：…`、夜間のカレンダー補充が作った定型文）は未承認・画像なし。本文の質が低いので、承認前に書き直す。
