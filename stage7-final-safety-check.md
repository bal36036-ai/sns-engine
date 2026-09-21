# 本番live化前の最終安全確認(Stage 7・2026-09-21)

## 発見して修正した重大な不具合(3件)

### 不具合1：候補取得がscheduled_atを見ていなかった
`claimCandidates`のSQLが`status IN ('ready','scheduled')`だけで絞り込んでおり、`scheduled_at`が未来の投稿も即座にCronの処理対象になっていた。
→ `AND (scheduled_at IS NULL OR scheduled_at <= now())`を追加。実データ(未来1時間後のテスト行)で、候補に一切含まれないことを確認済み。

### 不具合2：「過去日時」ガードが正常投稿まで全滅させていた
「予約日時が過去なら即expired」という設計のため、**Cronが15分間隔で動く以上、投稿対象は原理上必ず「多少過去」になる**。この結果、意図した投稿がすべてexpiredになり、一切投稿されない状態だった(実機テストで発覚)。
→ 30分の猶予(Cron間隔15分+バッファ)を設け、それを超えて見逃された場合だけexpiredにするよう修正。DBトリガー側も、`sent`への遷移(投稿確定後)はこのチェック対象から除外(sentは予約時刻を過ぎてから確定するのが正常なため)。境界値(1分前→処理される、45分前→expired、sentへの確定→ブロックされない)を全て実データで確認済み。

### 不具合3：本番登録コードの実装不備
- 動画ファイル(.mp4)を常に`{image:{url}}`としてBufferへ送信しており、実際には失敗する状態だった → 拡張子判定で`{video:{url}}`/`{image:{url}}`を切り替えるよう修正
- YouTube投稿の必須項目(title・categoryId)が未設定だった → 自動生成(本文の先頭95文字をタイトルに、カテゴリは過去投稿と同じ「Science & Technology」)するよう修正
- `mode: "addToQueue"`のため、Bufferの独自キューに入り、決めた投稿時刻が無視される設計だった → Cronが処理する時点で予約時刻は既に過ぎているため、`mode: "shareNow"`(即時配信)に修正

これらは全てdry-runでは検知できない箇所だった(dry-runは登録直前で止まるため)。実際にBufferへ登録する本番相当のテストは、実SNSへ投稿されてしまうため意図的に行わず、コードレビューと境界値テストで担保した。

## タイムゾーン検証(実データ)

Supabaseに保存された`scheduled_at`(UTC)を`Intl.DateTimeFormat`で`Asia/Tokyo`変換し、意図した時刻と完全一致することを確認：

| テーマ／媒体 | UTC保存値 | JST変換結果 | 意図した時刻 |
|---|---|---|---|
| Day10 YouTube | 2026-09-21T21:30:00Z | 2026/09/22 06:30 | ✅一致 |
| Day10 TikTok | 2026-09-22T03:15:00Z | 2026/09/22 12:15 | ✅一致 |
| Day10 Instagram | 2026-09-22T10:30:00Z | 2026/09/22 19:30 | ✅一致 |
| Day9 TikTok | 2026-09-22T21:30:00Z | 2026/09/23 06:30 | ✅一致 |
| Day9 YouTube | 2026-09-23T03:15:00Z | 2026/09/23 12:15 | ✅一致 |
| Day9 Instagram | 2026-09-23T10:30:00Z | 2026/09/23 19:30 | ✅一致 |

9時間ズレ等は一切無し。判定ロジック(`new Date(scheduled_at) <= new Date()`、およびPostgres側の`scheduled_at <= now()`)はUTC実時刻(エポック秒)同士の比較であり、Node.js実行環境やGitHub Actionsランナーのローカルタイムゾーン設定に依存しない設計のため、実行環境がUTCでもJSTでも結果は変わらない。

## 仕様の明記：Cronは秒単位で厳密ではない

GitHub Actionsの`schedule`は`*/15 * * * *`(15分間隔)で動作するが、実行タイミングは保証されない(数分の遅延がありうる)。そのため本システムは**「06:30ちょうどに投稿」ではなく「06:30以降、最初にCronが実行されたタイミングで投稿」**という仕様である。これは意図的な設計であり、不具合2の30分猶予もこの前提に基づく。

## その他の安全確認項目(実装済み・確認済み)

| 項目 | 状態 |
|---|---|
| ready以外は投稿されない | ✅ `claimCandidates`が`status IN ('ready','scheduled')`のみ対象 |
| 15分Cronの再実行でも二重投稿されない | ✅ `claimed_at`+`FOR UPDATE SKIP LOCKED`のロック機構、2回連続実行で実証済み |
| external_post_idが存在する投稿は再送されない | ✅ `processOne`内で明示チェック |
| Buffer側にも同一投稿があれば停止する | ✅ `findDuplicatePost`で生きた確認、動作実績あり |
| media URLが取得不能なら投稿しない | ✅ `headCheck`でHTTP到達確認 |
| 公開可否false／未公開機能は投稿しない | ✅ ガード実装済み |
| X/Threadsは対象外のまま | ✅ `AUTOMATED_SNS`チェックで除外 |
| API/DBエラー時は安全な状態にする | ✅ try/catchで`failed`化、DB接続エラーは書き込みせず報告のみ |
| 秘密情報はログへ出さない | ✅ GitHub Actionsが自動マスク(実行ログで`***`表示を確認済み) |

## workflow_dispatch(手動実行)の誤操作防止

- `schedule`トリガー(15分ごとの自動実行)：**live**で実行
- `workflow_dispatch`(手動実行)：`live`パラメータを明示的に`true`にしない限り、常に**dry-run**

## 受入テスト用の監視スクリプト

`audit-live-post.js <topic_id> <target_sns>`で、Supabase記録とBuffer実データを突き合わせて以下を1コマンドで確認できる：
- Cron登録時刻(`post_result.registeredAt`)
- Buffer post ID・実際のSNS投稿URL(`externalLink`)・Buffer側の送信時刻(`sentAt`)
- Supabaseの状態(`sent`になっているか)
- 二重投稿チェック(同一テーマ・媒体でsent状態が2件以上無いか)
- エラー内容

既存の送信済み投稿で動作確認済み(読み取り専用、書き込みは一切しない)。

## live化状況

上記の修正・確認をもって、GitHub Actionsの`schedule`トリガーをliveモードで動作する状態にした(コード修正済み・push完了)。最初の自動投稿はDay10 YouTube(2026-09-22 06:30 JST以降の最初のCron実行)。
