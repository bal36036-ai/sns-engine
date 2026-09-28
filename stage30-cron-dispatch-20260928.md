# stage30｜自動投稿の起動をSupabaseの定期実行から行う（2026-09-28）

対応：Claude Code。ばるの承認「直接でもいいですよ」（Codex経由でなく直接実装）。

## 背景

- `cron-engine.yml` の GitHub `schedule` が9/27午後から3〜6時間に1回しか動かず、9/27夜の2件が期限切れ（stage29）。
- 実行時刻を7/22/37/52分にずらしても改善せず、9/28は6:49の次が10:13だった。9:30のThreadsは43分遅れ（通常猶予内）で投稿。
- GitHub Actionsの使用量は643／2,000分（ばるが画面で確認）。無料枠切れではなく、GitHub公式に記載のある「高負荷時のschedule遅延・欠落」と判断。GitHubステータスは正常表示。

## 実装

1. `cron-engine.yml`（コミット`2010504`）
   - `repository_dispatch`（`types: [cron-live]`）を追加。`schedule` と `repository_dispatch(cron-live)` だけがlive、`workflow_dispatch`（手動）は従来どおりdry-run固定。
   - `concurrency`（`sns-cron-engine`、`cancel-in-progress: false`）で同時起動を1本ずつに。投稿の取り合いは`cron-engine.js`の`FOR UPDATE SKIP LOCKED`と`claimed_at`でも防止済み。
   - `schedule`は予備として残す。
2. Supabase（`supabase/20260928_sns_cron_dispatch_to_github.sql`、MCP `apply_migration`で適用）
   - `pg_net`・`pg_cron`を有効化。
   - `sns.dispatch_cron_engine()`：Vaultの`github_dispatch_token`を読み、GitHub API `POST /repos/bal36036-ai/sns-engine/dispatches`（`event_type=cron-live`）を送る。トークン未登録なら何もしない。`public`/`anon`/`authenticated`から実行権限を外した。
   - `cron.schedule('sns-cron-engine-dispatch', '7,22,37,52 * * * *', ...)`（jobid 1、active）。
   - トークン未登録の状態で関数を実行し、何も送らない（戻り値null）ことを確認。

公式根拠：GitHub「[Create a repository dispatch event](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)」（fine-grained トークンは Contents: write が必要＝[権限一覧](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)）、Supabase「[Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)」「[pg_net](https://supabase.com/docs/guides/database/extensions/pg_net)」「[Vault](https://supabase.com/docs/guides/database/vault)」。

## 残作業（ばる）

- GitHubで、`sns-engine`だけに限定した fine-grained トークン（Contents: Read and write）を作る。
- SupabaseのVaultに、名前`github_dispatch_token`で登録する。
- 登録後、Claude Codeが`net._http_response`とGitHubの実行履歴（event=repository_dispatch）で動作を確認する。

## 止め方

`select cron.unschedule('sns-cron-engine-dispatch');`（Supabase）。GitHub側は`repository_dispatch`の行を消せば元に戻る。

## 追記：鍵の登録と動作確認（2026-09-28 22:30 JST）

- ばるがGitHubのfine-grainedトークン（sns-engine限定・Contents読み書き・期限366日）を作成し、Supabase Vaultに`github_dispatch_token`で登録。Vault上で名前と形式（`github_pat_`、93文字）を確認（値は表示していない）。
- `select sns.dispatch_cron_engine();`で手動テスト → GitHub APIの応答 204。GitHubで`repository_dispatch`の実行（run 36428823787）が起動し、ログに「repository_dispatch(cron-live, Supabase pg_cron): live実行」を確認。成功で完了。
- この日は旧経路（GitHubのschedule）が15:59 JSTを最後に止まっていたため、12:45 Instagram（`281b2249`）・17:00 Threads（`aa0598b5`）は期限切れ、20:15 YouTube（`5aff942f`）は遅延ポリシーで確認待ちになった（設計どおり、遅れて自動投稿はしない）。
- 3件を`reslot-missed.js`（新規・汎用：期限切れ／遅延で戻った承認済み投稿を次の空き枠へ）で10/4の空き枠へ入れ直し（Instagram 12:45、Threads 9:30、YouTube 20:15）。`reschedule-calendar.js --apply`で下書き86件を後ろへ。
