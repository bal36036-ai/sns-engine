# Issue #5｜直近投稿の公開準備

確認日：2026-09-25 10:30 JST。[Issue #5の次工程指示](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5825021031)に対応。

## 実施したこと

- 初週のInstagram 5投稿に対応する画像25枚を `sns-material-storage` の公開URLへ置いた。公開URLは各ファイルのHTTP 200、`image/png`、元ファイルと同じバイト数を確認した。
- 初週のTikTok 4投稿、YouTube Shorts 4投稿に対応するナレーション付き動画8本を同様に公開URL化した。HTTP 200、`video/mp4`、元ファイルと同じバイト数を確認した。動画の技術確認は[前工程](stage16-issue5-audio-check-and-workflow.md)と[ローカル音声検証](stage19-issue5-local-audio-gate.md)に記録がある。人による発音・自然さの試聴は未確認。
- 上記13投稿の `media_urls` に計33 URLを登録。動画8投稿は[投稿用原稿](assets/issue5/video/publication-copy.md)にある最終本文へ更新し、VOICEVOX Nemoのクレジットとハリナビの安全注意を反映。YouTubeの投稿タイトルも原稿の値へ更新した。
- 13投稿の `readiness_state` を `waiting_media` から `needs_review` へ変更した。`status` は全件 `draft` のまま。`is_publishable` と `feature_published` は変更していない。
- 公開前検証を13投稿に実行。公開URLの取得・形式とBuffer上の同一本文照合に追加の問題は見つからなかった。全件で `公開可否false` と `未公開機能` が残る。
- Threadsの直近2投稿は本文を確認した。ローカルに `THREADS_ACCESS_TOKEN` がなく、Threads側の重複照合は未完了。9/24分の1投稿は予定時刻が過去になった。

## 現在の件数

| 媒体 | 今回URLを登録した投稿 | 登録URL | 今回のready化 |
|---|---:|---:|---:|
| Instagram | 5 | 25 | 0 |
| TikTok | 4 | 4 | 0 |
| YouTube Shorts | 4 | 4 | 0 |
| Threads | 0 | 0 | 0 |

`cal-` 147投稿の実測：`draft` 147、`ready` 0、予約 0、実投稿 0、失敗 0。X 22件・note 4件は `waiting_channel`、日時未定のまま。公開待ちの13投稿以外で、素材待ちはInstagram 17件、TikTok 15件、YouTube 14件。

## 直近の予定（日本時間）

- 9/25 20:15：YouTube Shorts `cal-20260925-a`（ハリナビ、動画URL・最終概要欄登録済み）
- 9/26 09:30：Threads `cal-20260924-b`（本文あり、Threads側重複未確認）
- 9/26 17:00：Threads `cal-20260925-a`（本文あり、Threads側重複未確認）
- 9/26 18:15：TikTok `cal-20260924-a`（キリドリ、動画URL・最終本文登録済み）

9/25 09:30のThreads `cal-20260924-a` は、今回の確認時点で過去日時の下書き。次回00:10のカレンダー自動実行結果を確認する。過去日時のままready化・投稿しない。

## 公開判断と残作業

`is_publishable=false` と `feature_published=false` は安全側の設定として維持した。これらを推測でtrueへ変えず、投稿ごとの公開承認と対象アプリの公開機能を確認してからready化する。SNS運用スキルは実投稿・予約にばるの明示的なOKを要求するため、最初の候補の動画・タイトル・本文・予定日時を提示して確認を依頼した。承認までは既存Cron・Buffer・Threadsへ流れない。

この工程で、X・note、投稿経路、GitHub Actions設定は変更していない。ローカルで未追跡だった5つのDay10作業ファイルにも触れていない。
