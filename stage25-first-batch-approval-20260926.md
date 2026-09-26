# stage25｜編集長レビューの反映と直近分の承認（2026-09-26）

2026-09-26 10:20〜10:35 JST、Claude Code。ばるの承認：「全部おすすめで！」（編集長レビューのおすすめ3点：直近1週間分の承認／要修正11件の修正／10月後半の見直しをChatGPTへ）。レビュー内容は `../運用メモ_20260926.md`。

修正はCodexへ依頼する予定だったが、Codexの実行環境では画像・動画を生成できず（stage24参照）、前回も途中で止まったため、Claude Code側で実施した。

## 1. 本文の修正とフォロー呼びかけの削減（`apply-20260926-text-edits.js`）

対象：確認待ち（`status=draft`・`readiness_state=needs_review`）のThreads 62件。`body_text` のみ変更。dry-runで全件の前後を確認してから適用。

- **要修正10件の本文差し替え**
  - 書きかけの文章：`d5a94998`（10/26）、`147b5b71`（10/27）
  - 制作メモの混入・画像がないのに「見てみます」：`b087c763`、`1c1198c7`、`7394cc1d`、`a727c0be`
  - 質問文がフォロー呼びかけの後ろにあった：`2b01b67f`、`540d1c68`、`9c159ab5`、`b4d206a9`（`b4d206a9` は質問が二重だったため追加分を削除）
- **フォロー呼びかけ（CTA）を3件に1件へ**：予定順に3件に1件だけ残し、質問で終わる投稿には付けない。結果、CTAを残す17件／外す45件。Instagram・TikTok・YouTubeは変更なし。
- 変更47件。

## 2. Instagram画像1枚の差し替え

- `fd0eb894`（9/29 Instagram キリドリ「紙メモと計画画面」）の3枚目。見出しは「メモした条件を入力する」なのに、図がハリナビ用の「前提条件／対象項目／確認」だった。
- [build_20260928_03_v2.py](assets/issue5/instagram/build_20260928_03_v2.py) で、同じ枠・配置のままラベルを「定尺／部材と本数／刃幅」に変えた `20260928_instagram_03-v2.png` を作成（元の画像・`build_carousels.py` は変更なし）。
- `sns-material-storage` に `issue5-20260928-instagram-03-v2.png` として配置（HTTP 200・`image/png`・SHA-256一致）。`apply-20260926-ig-slide.js` で `media_urls` の3番目だけ差し替え。

## 3. 直近分の承認と ready 化（`approve-20260926-first-batch.js`）

- 対象：9/26 17:00〜10/2 の確認待ち21件。要修正で直したばかりの `a727c0be`・`2b01b67f`・`fd0eb894` は、ばるが修正後を見ていないため対象外。
- 各投稿で、下書き・確認待ち・未投稿・未来の予定日時・本文あり・（Threads以外は）素材あり、を確認してから `is_publishable=true`・`feature_published=true`・`readiness_state=ready_candidate` に更新。
- Instagram・TikTok・YouTube（11件）：既存の `promote-to-ready.js` で ready 化（Buffer側の同一本文照合つき）。全件 ready。
- Threads（10件）：このPCに `THREADS_ACCESS_TOKEN` が無く、`promote-to-ready.js` の Threads API 重複照合ができない。DB内で同じ本文の ready／scheduled／sent 投稿が無いことを確認して ready にし、`duplicate_check.result=none_in_db` と理由を記録。**Threads API での重複照合は、投稿直前に Cron（`cron-engine.js` の `processOne`、GitHub Actions のトークンあり）が必ず行う。**
- 9/26 18:15 の TikTok `ab4eca39` で `preflight-ready-post.js`（dry-run）を実行し `dry_run_ok`。Threads は preflight をローカルで実行すると Threads API エラーで failed になるため実行していない。

## 4. 予定時刻を過ぎた1件の繰り延べ

- `54c748e6`（Threads、9/26 09:30）は承認前に予定時刻を過ぎていた。
- 毎晩0:10の自動処理と同じ `reschedule-calendar.js --apply` を実行。`54c748e6` は 9/30 09:30 へ移り、確認待ちのThreads下書き52件が順に1枠ずつ後ろへ移った（ready の投稿は動かない）。
- 移動後の `54c748e6` も同じスクリプト（引数でID指定）で承認・ready 化。

## 5. 結果（10:35 JST時点）

- ready：23件（今回22件＋以前からの `c4c64bbc`）。9/26 17:00〜10/2 09:30 の予定はすべて ready。
- 確認待ち：52件（修正済み3件を含む。`fd0eb894` 9/29 12:45、`a727c0be` 10/2 17:00、`2b01b67f` 10/3 09:30）。
- 予約・実投稿・Bufferへの登録はこの時点では無し。予定時刻になると15分ごとの Cron が投稿する。

## 6. ChatGPTへの見直し依頼

10/10以降のThreads 36件の見直し依頼を `chatgpt-request-20260926-october-review.md` に作成し、Issue #5 のコメントでChatGPTへ依頼した。

## 7. 追記：修正後3件の承認（2026-09-26）

ばるが修正後の内容を確認して「OKです」。`approve-20260926-first-batch.js` にIDを指定して同じ手順で ready 化（ID指定時は10/2までの期間制限をかけないよう変更）。

- `fd0eb894` 9/29 12:45 Instagram（3枚目を -v2 画像に差し替え済み）：`promote-to-ready.js` で ready（Buffer側照合あり）
- `a727c0be` 10/2 17:00 Threads、`2b01b67f` 10/3 09:30 Threads：DB内の重複なしを確認して ready（Threads API照合は投稿直前のCron）

これで ready は26件（9/26 17:00〜10/3 09:30）。
