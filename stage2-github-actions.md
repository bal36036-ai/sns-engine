# 実行基盤：GitHub Actions採用(2026-09-21・Hyperdrive不採用)

## 経緯

Cloudflare Cron(Hyperdrive経由)を検討したが、実装量・秘密情報の扱いやすさの両面でGitHub Actionsの方が有利と判断(ばる指示による方針転換)。Hyperdriveは将来Cloudflareへ寄せたくなった場合の候補として保留。

## リポジトリ

- https://github.com/bal36036-ai/sns-engine (Private)
- Cloudflare Workers(`sns-material-storage`)は引き続き素材公開URL化専用として使用。役割は変更していない。

## Supabase接続方式

- **Session Pooler(IPv4対応)を採用**：`aws-0-ap-northeast-1.pooler.supabase.com:5432`
- ユーザー名は`sns_engine.dvysbebkzvvqyqtlgqcx`(プーラー経由はこの形式が必要)
- 直接接続(`db.xxx.supabase.co`)はIPv6のみのケースがあり、GitHub Actionsランナーでの安定性を考えてプーラーに統一
- `db-client.js`は環境変数だけで接続先を切り替えられる設計のため、コード変更なしでこの接続方式に対応できた

## GitHub Actions構成

- ワークフロー：`.github/workflows/cron-engine.yml`
- スケジュール：15分間隔(`cron: "*/15 * * * *"`)
- **デフォルトは常にdry-run**。本番投稿には`workflow_dispatch`で`live: true`を明示的に指定する必要がある(スケジュール実行では指定不可のため、自動実行は絶対にdry-runのまま)
- Secrets：`SNS_ENGINE_DB_PASSWORD`・`BUFFER_API_KEY`をGitHub Actions Secretsへ登録済み(値はコード・ログに一切出ない。ログ上は自動マスクされることを実行ログで確認済み)

## 動作確認(2026-09-21・実機)

- 手動実行(`workflow_dispatch`、dry-run)：**成功**
- Supabase(Session Pooler)への接続：成功
- Buffer APIキーの読み込み：成功(ログ上は`***`でマスク)
- 対象データが無い状態でも正常終了(`processed: [], errors: []`)することを確認
- Node.jsのバージョン警告を修正(20→24)し再pushして解消

## 現在の状態

- **本番投稿は無効のまま**(スケジュール実行は常にdry-run。ばるが意図的に`live: true`で手動実行しない限り、実際にBufferへ登録されることはない)
- 15分ごとに自動実行される状態になっている(現在は候補データが無いため実質何もしない)

## 未実施(次のステップ)

- 実際の投稿候補(Supabaseの`sns.posts`)をdraft→readyへ進める運用フローの整備
- 一定期間dry-runを様子見したうえで、本番投稿を有効化するかの最終確認
- Codex制限解除後のコードレビュー
