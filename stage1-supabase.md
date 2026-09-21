# Stage 1: Supabase状態ストア設計(実装済み・2026-09-21)

## 接続先

- プロジェクト：`bal36036-ai's Project`(既存。リースナビ用と共用インスタンスだが**スキーマで完全分離**)
- プロジェクトID：`dvysbebkzvvqyqtlgqcx`
- スキーマ：`sns`(リースナビ用テーブルは`public`スキーマのまま、一切変更していない)

理由：Supabase無料枠は1組織2プロジェクトまでで、既に上限(`bal36036-ai's Project`＝リースナビ、`kiridori`)。新規プロジェクト作成は不可のため、既存プロジェクト内にスキーマ分離で対応(ばる承認済み)。

## テーブル：`sns.posts`

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid (PK) | 投稿ID |
| topic_id | text | ネタ/キャンペーンID |
| target_app | text | 対象アプリ(kiridori/harinavi/pipenavi/brand等) |
| target_sns | text | 対象SNS(instagram/tiktok/youtube/x/threads/noteのみ許可) |
| title | text | タイトル(note記事等) |
| body_text | text | 本文 |
| media_urls | text[] | 画像/動画の公開URL(複数可) |
| scheduled_at | timestamptz | 予約日時 |
| is_publishable | boolean | 公開可否 |
| feature_published | boolean | 対象アプリ機能が公開済みか(false=未公開機能) |
| status | enum | 状態(下記) |
| guard_reason | text | ガードで停止した理由(自動設定・人が書かない) |
| duplicate_check | jsonb | 重複チェック結果 `{checked_at, result, matched_post_id}` |
| external_service | text | 'buffer'等(将来Metricool等へ差し替え可能) |
| external_post_id | text | Buffer等の外部post ID |
| post_result | jsonb | 投稿結果(URL・sentAt等) |
| error_detail | text | エラー内容 |
| metrics | jsonb | 分析用メトリクス |
| created_at / updated_at | timestamptz | 自動管理(updated_atはトリガーで自動更新) |

## 状態遷移

```
draft ──(本文・素材が揃う／公開可否true／機能公開済み)──> ready
ready ──(重複チェック実施・duplicateなし／予約日時が未来)──> scheduled
scheduled ──(外部API登録成功)──> sent
scheduled ──(登録・配信失敗)──> failed
どの状態からも ──(ガード発動 or 人の判断が必要)──> needs_review
どの状態からも ──(予約日時が過去のまま検出)──> expired
needs_review ──(人が修正)──> draft / ready へ差し戻し
```

## 安全ガード(DBトリガーで強制。アプリ側のバグでも必ず効く)

`status`を`scheduled`または`sent`にしようとした瞬間、以下を自動チェックし、**該当したら問答無用で`needs_review`または`expired`へ書き換える**(実際の投稿には絶対に進めない)。

| 該当条件 | 差し戻し先 | guard_reason |
|---|---|---|
| feature_published = false(未公開機能) | needs_review | 未公開機能 |
| is_publishable = false(公開可否false) | needs_review | 公開可否false |
| scheduled_atが過去 | expired | 予約日時が過去 |
| media_urlsが空(IG/TikTok/YouTube対象時) | needs_review | 素材不足 |
| duplicate_checkがduplicate/possible_duplicate | needs_review | 重複疑い |

動作確認済み：過去日時で`scheduled`を試みたところ、自動的に`expired`・`guard_reason: 予約日時が過去`に差し戻されることを確認(テストデータは削除済み)。

## 権限分離

- `sns`スキーマはRLS有効化、anon/authenticatedロールへの権限は明示的に剥奪(`REVOKE ALL`)。
- PostgRESTの公開スキーマ設定はデフォルトで`public`のみのため、`sns`スキーマはWeb API経由でも露出しない。
- SNS運用エンジン専用ロール`sns_engine`を作成済み(現時点ではNOLOGIN＝未使用)。実際にエンジンから接続する段階で、ばるにSupabaseダッシュボードからパスワード設定をお願いする(Cloudflare/Bufferの時と同じ、値を私が見ない手順)。

## 将来の移行のしやすさ

- テーブル名・スキーマ名はコードに直書きせず、環境変数(`SNS_DB_SCHEMA=sns`等)で切り替える設計にする(次段階で接続コードを書く際に反映)。
- 別プロジェクトへ引っ越す場合も、`sns`スキーマのDDL一式をそのまま新プロジェクトへ適用すれば移行できる構成。

## DB接続コード実装・接続テスト(2026-09-21・完了)

**方式比較の結論**：`sns_engine`専用DBユーザーによる直接Postgres接続を採用(service_roleキー方式は不採用)。理由：service_roleはプロジェクト全体(リースナビの`public`スキーマ含む)にアクセスできてしまい、Stage 1で作った権限分離と矛盾するため。加えて、将来Cloudflare CronからPostgresへ接続する際は、Cloudflare公式の「Hyperdrive」がこの直接接続方式にそのまま対応する。

**パスワード設定の経緯**：Claude Codeがパスワードを生成・設定・env登録まで自動で行おうとしたところ、**安全装置(Credential Leakage / Credential Materialization)に2回ブロックされた**。これはシステムによる意図的な保護と判断し、無理な迂回はせず、ばる本人がSupabase SQL Editorで生成・設定、Windows環境変数`SNS_ENGINE_DB_PASSWORD`への登録も本人が実施。Claudeはこの値を一切保持・記録していない。

**接続コード**：`db-client.js`(接続情報はすべて環境変数経由。ホスト名・スキーマ名等はコードに直書きせず、将来の移行を容易にする設計)

**接続テスト結果**(`test-db-connection.js`、テストデータは削除済み)：
- DB接続：成功(`current_user: sns_engine`)
- 投稿候補の取得：成功
- 状態更新(draft→ready→scheduled→sent)：成功
- Buffer post IDの保存：成功
- 投稿結果(URL・送信時刻)の保存：成功
- 重複チェック結果の保存：成功
- エラー内容の保存(failedパターン)：成功
- **`public.vendors`(リースナビ側)へのアクセス：拒否された(権限分離が機能していることを実地確認)**

**追加対応**：RLS有効化のみでは`sns_engine`自身もブロックされたため、`sns_engine`専用のポリシー(`sns_engine_full_access`)を追加。anon/authenticatedには引き続きポリシーを与えていないためアクセス不可のまま。

## 未実施(次のステップ)

- Cron実装はまだ着手していない(指示どおり)
