# Buffer最終状態の同期と対象動画復旧（2026-10-13）

## 承認と対象

本人の通常会話「お願い」、今回の復旧・表示修正に限る自宅PC使用への「いいよ」を委任元から受領。対象YouTube1件の再登録1回、状態表示修正、通常commit/push、既存公開反映と読戻しが範囲。定期監視のPC不使用制約とは別Task。

- YouTube DB ID：`632d3f47-d0a5-43f2-a49a-a2a99792662d`
- タイトル：終わったけど、伝わってる？｜現場の会話劇
- 素材：https://sns-material-storage.gbapp.workers.dev/np1026-skit-7-20261103.mp4
- TikTokは親が既存Buffer ID `6acda783c210c8c6dd48831c` を復旧済み。子は再送せず状態同期のみ。
- Threads返信ファイル・既存未追跡ファイルを編集・commit対象にしない。

## 原因と修正

`cron-engine.js` がBufferの `sending` を受け取った時点でDBを `sent` にしていた。受付後に最終配信結果を読む処理がなかった。

- `buffer-client.js` に読み取り専用 `getPost` を追加。実APIのPostInput・status enum・channelId・error.message・sentAt・externalLinkを確認した。
- `sending` は処理中、`scheduled` は受付済み、`sent` だけを公開成功、`error` は失敗、その他は確認待ち。
- DBの既存enum・安全トリガーを維持。受付/処理中は `ready` と外部ID・post_resultの配信状況で保持する。外部ID付きは候補抽出と直接処理の両方で再送しない。
- 定期live実行に最終状態の同期を追加。1回最大50件、前回確認時刻の古い順。同期はcreatePost/retryを呼ばない。参照失敗やID/投稿先不一致時は既存データを保持してエラーを報告する。
- post_resultは既存の浅いマージを継続し、過去の失敗・dry-run履歴を保持。成功時に以前のエラーを解除し公開URL・公開時刻を保存。
- ダッシュボード `bal36036-ai/sns-dashboard` もカード・詳細・件数・絞り込み・要対応判定を同じ配信状況へ統一。旧sent/sendingの誤表示も補正する。

## 復旧結果

YouTube公開チャンネル全18本で対象タイトルなし。Bufferチャンネル一覧18件・次ページなしで同本文/同素材なしを再登録直前に確認。対象行をロックし、元の予約時刻（12:45 JST）・元エラー・承認・1回試行記録を先にDBへ確定。再実行は試行記録で停止する。

既存 `processOne` の公開条件・素材到達・重複確認を経由し、対象だけ復旧時刻へ変更して1回再登録。他のready投稿は送っていない。

- Buffer ID：`6acddf0d5229b40e869b3425`
- Buffer `sentAt`：2026-10-13 16:34:39 JST
- 公開URL：https://www.youtube.com/watch?v=PMfZl8TQE7A
- 実ページ：タイトル・本文がDBと一致、作者「げんばアプリ工房」、videoId一致、公開/再生可能（playability OK、isPrivate false）、video duration 14.501秒・readyState 4。
- DB読戻し：status sent、delivery_status published、公開URL保存、error_detail null、recovery_attempt保持。
- TikTok：既存IDのsent/公開時刻16:22:36 JST/公開URLを同期し読戻し確認。https://tiktok.com/@genba_apps/video/7696049056107416840

## 検証

- 不具合を修正前のテストで再現（sendingがsentになる、最終同期なし、登録済みが遅延でexpiredになる）。
- `node --test test-buffer-status.js`：10/10成功。受付/処理中/成功/失敗/未知状態、参照失敗・ID/チャンネル不一致、履歴保持、繰返し同期でcreate 0、既存ガード、live同期、手動dry-runを検証。
- `node --check cron-engine.js`、`git diff --check` 成功。
- Dashboard関連6テストと型チェック・本番ビルド成功。lintは既存3警告、エラーなし。
- 認証情報抽出・表示・認証設定・権限変更・DBスキーマ変更なし。既存プロセス環境変数と正規クライアントだけ使用。

初回の通常sandboxでは対象Git作業ツリーへアクセスできず、対象・承認根拠を明示して正規のrequire_escalatedを使用し承認された。承認審査の拒否なし。ブラウザツールはruntime起動エラーのため、既存Puppeteer/Edgeでログインせず公開ページを検証した。
