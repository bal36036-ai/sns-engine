# Issue #4: 30日投稿在庫とカレンダー運用（2026-09-24）

## 現在地

- 正本は Supabase `sns.posts`。2026-09-24 に、2026-09-24〜10-24 の不足枠142件を登録した。再実行で追加0件を確認した。
- 新規分はすべて `draft`、`is_publishable=false`、`feature_published=false`。公開済み機能を推定しない。公開・予約・ready昇格は行っていない。
- 30個の元ネタを10分類で回し、同じネタの媒体別文面は `topic_id` で束ねる。Threadsの1日2枠目は別の `topic_id` とする。
- 日本時間で Threads 2件/日、Instagram 5件/週、TikTokとYouTube Shortsは各4件/週、Xは平日の下書き、noteは月曜の企画下書きを目標とする。
- 毎日00:10 JST の GitHub Actions は不足枠だけを `draft` で補う。手動実行は読み取りのみ。既存の投稿Cronは変えない。

## 安全条件

- `ingest-post.js` は topic_id と同一媒体本文の両方を確認。DB既存の `(topic_id,target_sns)` 一意制約も残す。
- 素材のない Instagram・TikTok・YouTube は `waiting_media`。Threadsはテキスト投稿が可能だが、新規候補は `needs_review` に留める。X/noteは `waiting_channel`。
- `failed`、`needs_review`、`expired` は補充件数に数えず、元の行を自動再投稿しない。
- `cron-engine.js` は `ready` / `scheduled` のみ処理する。`due_drafts` は予定時刻を過ぎても未承認の行数であり、実投稿の対象ではない。

## 確認結果と未完了条件

- 登録直後のDB集計: Instagram 21、Threads 60、TikTok 18、YouTube Shorts 17、X 22、note 4、計142。新規分の `(topic_id,target_sns)` と `(target_sns,本文)` はどちらも142種類。
- `node --test test-calendar.js` 4件成功。`node maintain-calendar.js` の再実行は不足0件。
- 公開ダッシュボードは既存URL `https://sns-dashboard.gbapp.workers.dev` に反映。Cloudflare Version ID `d38f0563-2ff1-4cea-b22e-268c8de884f2`。9月24日と10月24日の予定をブラウザで確認し、320px・390px・768px幅で大きな崩れがないことを確認した。実機のiPhone/iPadは未確認。
- 下書きはCronに拾われない。予定時刻に `processed: []` となる場合があるため、Issueのこの完了条件は、内容・素材確認と公開承認を受けて各行を `ready` に進めるまで未達。
- 元ネタは30件、本文の言い回しは3巡分を用意している。重複する時期が来たら補充を止めてワークフロー失敗として知らせる。新しい実例や改善情報は事実確認後に補う。
- 投稿文は確認用の下書き。実例は実データではなく、動作確認用の架空条件を扱う企画としている。
