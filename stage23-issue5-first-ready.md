# Issue #5｜9/25 YouTube Shorts 1件のready化

2026-09-25 13:00 JST。ユーザーが指定した `cal-20260925-a`（YouTube Shorts／ハリナビ、DB ID `6ebb387d-e257-495d-9974-76b9fea50e99`）だけを対象にした。

## 公開前に確認したこと

- 現行の公開Web `https://harinavi-gbapp.gbapp.workers.dev/` をブラウザで開き、V26.09.062の実画面でスパン3,000mm・吊り荷2tの検算を実行した。結果に曲げ応力69.691 N/mm²、未確認項目に関する注意、名前を付けて保存するボタンが表示された。動画に示す条件・数値・保存の案内と照合した。
- DBの現行タイトルは「その計算結果、元の条件をたどれますか？｜ハリナビ」。本文には動作確認用の例、一次照査の補助、専門家による最終判断、`音声：VOICEVOX Nemo` がある。前回準備後に加わった「公開まで、こんな感じで開発の様子を発信していきます。」も確認し、本文を上書きせず保持した。
- 動画URL `https://sns-material-storage.gbapp.workers.dev/issue5-20260925-youtube-harinavi-narrated.mp4` はHTTP 200、`video/mp4`、541,809バイトでローカル正本と同じ。ファイルは28秒、H.264 720×1280、AAC音声あり。VOICEVOX Nemo公式規約は、クレジット表記を条件に商用・非商用の利用を認めている（2026-09-25再確認）。
- 予定日時は2026-09-25 20:15 JSTで未来。履歴・外部投稿ID・処理中ロック・重複記録はなく、Buffer側の同一本文照合にも該当なし。`verify-before-ready.js` は公開条件更新後に `ok=true`。

## 実施結果

- 対象1件に限り `is_publishable=true`、`feature_published=true`、`readiness_state=ready_candidate` とした。更新時はID、媒体、日時、タイトル、本文ハッシュ、素材URL、変更前の状態を照合した。
- 既存の `promote-to-ready.js` で `draft → ready` に昇格。再度Buffer側の同一本文照合を通過した。
- 予定前でも指定したready投稿だけを試せる `preflight-ready-post.js` を追加。Cron本体の `processOne` を `dryRun:true` で呼び、他の投稿を取得しない。通常のCron候補抽出・live経路は変更していない。この1件の結果は `dry_run_ok`、DBの `post_result.ready_to_send=true`、`duplicate_check.result=none`。
- 結果確認時の `cal-` 投稿147件はYouTube Shortsの本件1件だけが `ready`、ほか146件は `draft`。本件の `external_post_id` は空、予約・実投稿は未実施。X・noteを含む他の投稿の状態は一括変更していない。

## 通常投稿経路

`.github/workflows/cron-engine.yml` は15分ごとのscheduleでlive処理を行い、手動起動はdry-run固定。本件は予定時刻までは対象外で、9/25 20:15 JST以降の通常scheduleで既存のBuffer経路へ進む。直近のschedule実行は9/25 12:49 JST開始で成功していたが、これは本件のready化前なので実投稿の証拠ではない。予定後は `audit-live-post.js` でDB・Buffer・投稿URLを照合する。

両JavaScriptファイルの構文確認、`node --test test-calendar.js`（4件）、指定IDの実DB dry-runを確認。発音・自然さの人による試聴と、実際のSNS投稿結果は現時点で未確認。
