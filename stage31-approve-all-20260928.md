# stage31｜確認待ち101件の一括承認（2026-09-28）

対応：Claude Code。ばるの判断：承認リスト（`../承認リスト_確認待ち_20260928.xlsx`、101件）を送付後、「とりあえず全部見るの大変だから全部いいよ」。

## 実施

- `approve-20260926-first-batch.js` に101件のIDを渡し、dry-runで全件が条件（下書き・確認待ち・未投稿・予定日時が20分以上先・本文あり・画像動画の投稿は素材あり・ThreadsはDB内の同一本文なし）を満たすことを確認してから `--apply`。
- Instagram・TikTok・YouTube（50件）：`promote-to-ready.js` で ready（Buffer側の同一本文照合つき）。全件 ready。
- Threads（51件）：DB内の重複確認のうえ ready。Threads APIの重複照合は投稿直前にCronが実施。

## 結果

- ready 121件（9/29 09:30〜11/1 20:15）：Threads 62・Instagram 23・TikTok 17・YouTube 19。確認待ちは0件。
- 残り：X・note（接続待ち）31件、日程待ち2件（legacy）。

## 注意

- 動画31本は、人による音声の試聴をしないまま承認された（ばる判断）。
- 投稿はSupabase pg_cron → GitHub `repository_dispatch` で起動する（stage30）。投稿後の反応確認と、抜けた投稿の入れ直し（`reslot-missed.js`）は継続。
