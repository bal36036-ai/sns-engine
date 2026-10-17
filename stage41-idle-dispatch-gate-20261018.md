# 空の定期確認だけ GitHub への合図を省略する変更

状態：2026-10-18 08:34:12 JSTに本番DB適用済み、GitHub保存済み。08:37自然cronの空振り省略を確認。次の通常投稿の自然実行を追跡中。

## 目的と承認範囲

本人が委任元で承認した、SNS Actions 無料枠節約の最小修正。
`sns.dispatch_cron_engine()` は投稿候補も Buffer 配信同期候補もないときだけ、Vault の読取りと HTTP 送信の前に `NULL` を返す。
候補ありの送信先・本文・鍵の参照先・10秒タイムアウトはそのまま。

- 基準 main：`02e623c8d97e69a92b6ddab3faeb905e1c73b36f`。2026-10-18 JST 作業開始時・引渡し前の `ls-remote` と一致。
- 正本：`C:\新しいフォルダー\OneDrive\AI作成\SNS集客\エンジン`。
- 適用指示：`C:\新しいフォルダー\OneDrive\AI作成\AGENTS.md`。SNS集客・エンジン配下に独自 AGENTS.md はない。
- 正本には既存差分があるため、正本を fetch/pull/編集せず、GitHub からタスク内の専用 sparse clone を作成した。
- 隔離作業：`C:\Users\sdk_y\Documents\Codex\2026-10-18\task-2\sns-engine-dispatch-guard`、ブランチ `codex/skip-idle-dispatch`。
- 当初は実装・mock/ローカルDB検証・レビューだけの承認。追加で本人がGitHub保存・push・本番適用・次の通常投稿追跡を承認（返信メッセージID `Sentinel_40f3ffecc93081919549e83aa25a1574`、委任元による記録）。課金・予備経路変更は対象外。
- 手動の実投稿・dispatch・再送・Actions起動・Issue送信は行わない。本番書込は承認済みの移行だけ。既存の通常予定投稿を読取追跡する。秘密は取得・出力しない。別のキリドリ作業は変更しない。

## 変更ファイル

| ファイル | 内容 |
|---|---|
| `supabase/migrations/20261017224441_sns_skip_idle_cron_dispatch.sql` | 既存本文を照合し、先頭に2つの EXISTS 判定を追加 |
| `supabase/rollbacks/sns_skip_idle_cron_dispatch.sql` | 追加部分だけ除去し、元の無条件送信へ戻す |
| `tests/dispatch-guard/test-dispatch-guard.cjs` | 既存JavaScriptが発行するSQLとの同値性、ローカルPostgreSQL、権限、切戻しの回帰テスト |
| `tests/dispatch-guard/native-postgres.cjs` / `run-native-tests.cjs` | 一時PostgreSQL 17.6の起動・停止・安全な後片付けと、同じSQLテストの実行 |
| `tests/dispatch-guard/native-engine-worker.cjs` / `test-native-concurrency.cjs` | 独立Nodeプロセスと別DBバックエンドによるclaim競合・同時起動試験。外部送信はmock |
| `tests/dispatch-guard/package.json` / `package-lock.json` | テスト専用PGliteの固定版。ルートの運用依存は変更しない |
| `STATUS.md` | 本番未適用の作業状態 |
| このファイル | 運用説明・検証結果・レビュー記録 |

投稿ライブコード・60/180分の停止条件・Bufferクライアント・認証・権限・所有者・SECURITY DEFINER・15分cron・GitHub予備schedule・コメント通知・日次台帳は変更しない。

## 判定の意味

1. `claimCandidates` と同じ WHERE 条件を使用する。`ready/scheduled`、外部IDなし、日時NULLまたは期限到来、claimなしまたは10分より古い、が条件。
2. 投稿候補には `is_historical` の条件を追加しない。期限超過、素材不足、公開不可、停止媒体もここでは除外しない。既存の後段で安全に停止・状態更新させるため。
3. `syncBufferStatuses` と同じ WHERE 条件を使用する。Buffer・外部IDあり・`is_historical = false`、未確定結果や公開URL未取得を含む。
4. 停止媒体リストは現行 `PAUSED_SNS = ['instagram']` と同じ。停止中の同じ外部IDに付いた `not_found` の再確認待ちだけを除外する。24時間の設定自体は既存JS側に任せる。数値以外の `next_check_after` は既存と同様0として再確認する。
5. 選択順・LIMIT・行ロックは存在判定には不要。判定では行を変更・確保せず、取得と二重投稿防止は従来のJSに任せる。
6. 判定エラーを `NULL` に変換する例外処理は追加しない。列欠落・Vault障害・HTTP障害のエラーは呼出し元へ伝わる。

将来 `claimCandidates`、`syncBufferStatuses`、`PAUSED_SNS` を変更するときはSQLも同時に確認する。テストは実コードから抽出した WHERE 条件と移行SQLの文字列一致も検査し、停止媒体や条件の変更を検知する。
この新規テストは手動実行であり、既存Actionsには追加していない。
draftしかない回はdispatchしないため、その回の `due_drafts` 件数出力も省略される。候補がある起動では従来どおり出力する。別のコメント通知・日次台帳は変更していない。

## 適用・切戻しの仕組み

既存の記録用SQLは変更しない。新しい移行ファイルはSupabase CLIの `migration new` で作成した。
`pg_proc.prosrc` と `pg_get_functiondef()` を使い、記録済みの本文と一致するときだけ関数本文を差し替える。照合用MD5は秘密ではなく、改変検知用の指紋。
CRLFと前後空白を正規化した既存本文の指紋は `c49a3bc4b80c815f4b4911807784172c`。

本文に相違があれば `unexpected dispatch_cron_engine body` で停止する。相違を無視するために指紋だけ更新してはいけない。既存関数本文には秘密が含まれる可能性があるので、本文をログ・チャットへ出力しない。
既存定義を再利用する `CREATE OR REPLACE` により、OID・所有者・ACL（実行権限）と設定値を維持する。[PostgreSQL公式仕様](https://www.postgresql.org/docs/current/sql-createfunction.html)
移行と切戻しの再実行は追加・除去を重複させない。未知の本文はどちらもエラーで停止する。

本番適用の承認後に、対象DB・所有者権限・最新main・JS候補条件の不変を確認し、**この移行SQLだけ**を実行する。
既存の履歴が記録用ファイルなので、検討せず `supabase db push` で一括適用しない。移行SQL自体はdispatch関数を呼ばない。
移行と切戻しは各1つのDO文で、途中失敗時に変更が一括で戻る。明示的なBEGIN/COMMITは持たせず、移行ツールの外側トランザクションを早期確定しない。切戻しも切戻しSQLだけを実行する。

適用前に、関数所有者から `sns.posts` の候補行がJS接続ロール以上に見えることを確認する。RLS（行単位の参照制限）やFORCE RLSで関数所有者から行が隠れると、権限エラーにならず候補なしと判定されうる。所有者がスーパーユーザー/BYPASSRLSか、RLSなし/非強制RLSのテーブル所有者かを確認し、そうでなければ両ロールの候補件数を同一時刻で比較する。権限・ポリシーは今回変更しない。この前提が確認できるまで本番適用しない。今回の追加読取ではBYPASSRLSとテーブル所有を確認済み。適用までに設定が変わった場合は再確認する。

適用後の確認は、既存cronの自然実行の範囲で、対象なしの時刻にdispatch由来のActionsが減ること、候補ありの時刻は処理が進むこと、`cron.job_run_details` に判定エラーがないことを確認する。手動でdispatch関数を呼ばない。
切戻し後は従来どおり毎回dispatchするため、Actions消費も戻る。

## ローカル検証

初回はDockerが停止中だったため、[PGlite](https://github.com/electric-sql/pglite) 0.5.10（WebAssembly版PostgreSQL）をNode内の一時メモリDBとして使用した。SQLは実際にPostgreSQLで評価され、JSの条件を再実装した判定ではない。ただし通常のOSプロセスとして動くDBサーバーではなく、複数接続の行ロック競合は評価できなかった。
追加依頼では通常のPostgreSQL 17.6も使用した。[embedded-postgresのWindowsバイナリ](https://github.com/leinelissen/embedded-postgres) `17.6.0-beta.15` と `pg` `8.23.0` をテスト専用依存に固定。Windowsサービス登録はせず、`127.0.0.1`の空きポートに一時クラスターを起動し、終了時に停止・削除する。新しい永続サービス、既存の認証・権限設定への変更はない。
Vaultと `net.http_post` はローカルSQL関数のmock。HTTP処理はなく、テスト中の投稿APIも無効化している。fixtureは合成値だけ。

再実行（初回の `npm ci` のみパッケージ取得の通信あり、テスト実行は外部接続なし）：

```powershell
cd tests/dispatch-guard
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:native
cd ../..
node --test test-buffer-status.js
```

`test:native` はWindowsでは同梱バイナリを使う。他環境は既存のPostgreSQLのbinディレクトリを `SNS_TEST_PG_BIN` で指定できる。本番の接続文字列や環境変数は使用しない。一時DBの接続情報は固定のloopback・合成ユーザーだけで、外部DBを指定する入口はない。
このPCのWindowsサンドボックス内ではinitdbのWALファイル名変更が拒否された。通常のユーザー実行環境に限定して同じテストを実行すると成功した。管理者サービスや認証設定は変更していない。

- 実装前：空の移行ファイルで22件失敗を確認。未来・候補なし等でも既存関数が送信することをテストで検出した。
- 前回報告の72件の内訳：PGliteの56件＋既存mock回帰16件。56件はSQL静的検査1件、統合テスト親1件、DB小ケース54件というNode test runnerの件数。72個の独立した本番検証という意味ではない。
- 追加：同じ56件を通常のPostgreSQL 17.6で再評価し、さらに競合4件を追加した60件が成功（0件失敗・0件skip）。PGliteの56件も再成功。既存mock回帰16件は運用コード無変更のため前回の結果が有効。
- 検証対象：空、未来、due、日時NULL、ready/scheduled、10分の等号/直前、90/181分遅れ、外部ID/空文字、歴史フラグ、Buffer処理中/受付/失敗/不明/最終公開、停止Instagram再確認、ID変更、数値/文字列/配列/不正JSON、重複呼出し、エラー伝播、allow/deny、所有者/OID/ACL/設定保存、冪等な適用と切戻し。
- 省略時にVaultもHTTPも呼ばれず、投稿行も変わらないことを確認。
- 競合追加1：別々のPostgreSQLバックエンドPIDの2接続から同時にdispatch関数を呼び、両方がmock HTTPへ進むこととclaim未変更を確認。新たな重複dispatch抑止は導入していない。
- 競合追加2：未変更の `runCronEngine` を独立したNodeプロセスで2本起動。dispatch相当がSELECTの行ロックを保持したまま、schedule相当を実行。後者は `SKIP LOCKED` により候補0で完了し、前者だけmock投稿を1回行う。
- 競合追加3：登録済みIDを残してclaimを11分前にし、2プロセスを同時再実行。Buffer同期だけ行われ、再送0回。
- 競合追加4：候補2件・limit 1で2プロセスが行ロックを同時保持し、別々の投稿を取得。各1回のmock投稿・異なる外部ID2件を確認。
- 既存GitHub concurrencyとJS claim処理は無変更。実GitHubイベントは送らず、DBの同時起動を通常より厳しい並列条件で試した。
- 後片付け確認：テスト用postgresプロセス0、一時DBディレクトリ0。
- 実Buffer、実投稿、本番負荷は未検証。検証段階は以下の読取だけを実施し、その後の追加承認で本番移行を適用。自然cronの空振り省略は本番確認欄に記録。

## 本番の非秘密・読取確認（2026-10-18 JST）

正規Supabaseコネクタの対象プロジェクトは `dvysbebkzvvqyqtlgqcx`。別のkiridoriプロジェクトは操作していない。
`pg_proc`・`pg_roles`・`pg_class` 等のメタデータSELECTで確認した。

| 項目 | 結果 |
|---|---|
| 関数所有者 / SECURITY DEFINER | `postgres` / true |
| 言語 / 戻り値 / search_path | plpgsql / bigint / pg_catalog, public |
| 所有者のBYPASSRLS / SELECT権限 | true / true |
| sns.postsの所有者 / RLS / FORCE RLS | postgres / true / false |
| JS接続ロール / SELECT権限 / BYPASSRLS | sns_engine / true / false |
| 記録済み本文の指紋とのDB内部比較 | `recorded_body_matches = true` |

所有者はRLSを迂回して全行を見られるため、JS側が見られる候補をゲート側だけ取りこぼす懸念はこの時点で解消。JS側より広い範囲を見て余分にdispatchする可能性はあるが、投稿コード自体の参照制限は変更しない。
本文比較はサーバー内部で `md5(btrim(replace(prosrc, CRLF, LF))) = 既知の指紋` の真偽だけを返した。関数本文・Vault値・鍵・投稿データは取得・出力していない。関数実行・本番書込もなし。

## レビュー

- Codex：対象条件、外部副作用、権限保存、切戻しを自己レビュー。
- 追加依頼の通常PostgreSQL起動処理と競合テストはCodexが自己レビュー。運用コード・移行/切戻しSQLには追加変更なし。
- Claude Code：本人の既存許可の範囲で、変更SQL・合成テスト・関係する既存選択関数だけを読取レビュー実施。秘密・顧客情報・投稿データ・無関係ファイルは送信なし。`--safe-mode --tools '' --strict-mcp-config` と空MCP設定で編集・ツール・既存カスタマイズを無効化し、1ターンで正常完了。
- 結果：ブロッカーなし。SQL同値性、メタデータ保持、切戻し、エラー伝播に欠陥なしとの評価。本番確認を行った評価ではない。
- 適用前確認として、関数所有者/RLSの参照範囲、本文指紋の一致、draftだけの回の件数出力省略、停止媒体・10分条件の将来変更時の追従を記録。JSコメント追加の提案はライブコード無変更の範囲を守り、ここでの説明と手動テストで対応。
- 任意提案の外側BEGIN/COMMIT除去を反映。DO文自体の原子性を使い、外側の移行トランザクションとの干渉を避けた。変更後も新規56件が成功。運用コードを変更していないため、既存16件の成功結果はそのまま有効。
- 原本レビュー出力と送信した限定bundleは、この隔離コピー外の `..\claude-readonly-review\` に保存。レビュー対象SQLの後続差分はBEGIN/COMMIT除去のみ。

## 本番適用と追跡（2026-10-18 JST）

- 適用前に最新mainをfetchし、`02e623c`から検証済み2コミットだけ進んでいることを確認。正本の既存未保存差分は編集・pullせず保持。
- GitHub mainへ `86b298a`、`d433e6f` を通常のfast-forward pushで保存。
- 正規Supabaseコネクタで `sns_skip_idle_cron_dispatch` を適用しsuccess=true。移行履歴version `20261017233412`（2026-10-18 08:34:12 JST）。手動でdispatch関数を呼んでいない。
- 08:35:02 JSTの読取でゲートの全文一致、除去後の既存本文の指紋一致、所有者postgres・ACL `{postgres=X/postgres}`・SECURITY DEFINER・search_path維持を確認。投稿候補0、Buffer同期候補0。
- 08:37自然cron runid1914が08:37:00.060〜00.069 JSTに成功。08:37:44 JSTの読取で両候補0・対象URLへのHTTP送信待ち0・pg_netレスポンス最大ID1865のまま・新規repository_dispatch起動なし。移行前の最終dispatchは08:22 JSTのGitHub run39078745573。これらを合わせて空振り省略を確認した。cronログは関数のNULL戻り値そのものを保存しないため、戻り値を直接読み取ったわけではない。
- 次の通常投稿は09:30 JST Threads `2e78aeed-d762-4059-825f-b15bdad32478`。続く12:15 X、12:30 TikTok、12:45 YouTubeでBufferの状態同期を確認する。
- 追跡タスク「SNS通常投稿の公開確認」を09:42 JST開始で登録。読み取りと公開ページ確認だけを行い、公開成功時にURLと根拠を報告。通常投稿・同期を確認したら停止する。ローカルheartbeatはこのクラウド実行では非対応のため、接続確認済みのクラウドタスクを使用。
- GitHub CLIは未ログインなので再認証せず、正規GitHubコネクタを使う。GitHub Fetchの応答本文は `structuredContent.content` にあるJSONを必要項目へ絞る。
- 親セッションへのCodexアプリ内メッセージはthread not foundだったため、適用速報はこの委任の返答で報告する。

切戻しは `supabase/rollbacks/sns_skip_idle_cron_dispatch.sql`。対象関数に想定外の変更があれば停止し、現在の本文を出力せず指紋と承認範囲を確認してから判断する。切戻し後は無条件dispatchへ戻り消費も戻る。

## 本番運用上の注意

本番適用・pushは追加承認に基づき実施済み。課金設定や予備経路の変更は承認範囲外。
予備のGitHub scheduleは毎15分のままなので、候補なしでもそのscheduleからActionsは起動する。毎日96回のscheduleがすべて実行されると、ジョブ最低1分という委任時の前提では30日で2,880分になる。
この変更が減らすのは、候補なしのSupabase発dispatch分だけ。予備scheduleの実行頻度・欠落・両経路の重なりにより実削減量は変わる。無料2,000分以内や7〜8割削減は保証しない。予備経路変更・課金は今回の承認範囲外。
判定直後に候補ができた場合は次の15分確認または既存予備scheduleで拾う。GitHub待機中や他実行が先に処理した場合は空のジョブが残ることもある。
