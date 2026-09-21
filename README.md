# SNS運用エンジン(Stage 0)

作成日: 2026-09-21 ／ 作成: Claude Code(一時例外対応。Codex制限解除後にレビュー対象)

## これは何か

CLAUDE.mdの「SNS運用全体自動化」方針に基づき、Stage 0(素材公開URL化 + BufferのIG/TikTok/YouTube完全自動化)の実装物。

## 構成

```
SNS集客/エンジン/
├── worker/
│   └── sns-material-worker.js   … Cloudflare Workerのソース(公開URL配信用)
├── upload-to-public-url.js      … ローカル素材→公開URL変換スクリプト
├── buffer-client.js             … Buffer GraphQL API直接接続クライアント(MCP非依存)
└── README.md                    … このファイル
```

## デプロイ済みインフラ

- **Cloudflare Worker**: `sns-material-storage`(アカウント: `9bc881f6051ba1a8c950e655144d71c1`)
- **公開URL**: `https://sns-material-storage.gbapp.workers.dev/<ファイル名>`
- **KV Namespace**: `sns-material-storage`(id: `bbc7ea55e7c34f49a22268dbaad09030`)
- **既存のkiridori / harinavi-gbapp / sdk-nippouには一切触れていない**(別Workerとして新規作成)

## 認証情報(環境変数。Windowsユーザー環境変数として登録済み)

- `CLOUDFLARE_SNS_API_TOKEN`: Cloudflare APIトークン(Workers:管理権限のみ、対象アカウント限定)
- `SNS_WORKER_UPLOAD_SECRET`: Worker宛アップロード用の秘密鍵(ランダム生成・こちらのスクリプトのみが使用)

**値は本ファイル・Git・チャットのいずれにも記載しない。**

## 使い方

```bash
node upload-to-public-url.js <ローカルファイルパス> [公開先キー名]
```

成功すると公開URLが標準出力に返る。失敗時はエラーメッセージのみ返す(正常時は静かに完了する設計)。

## 将来R2へ切り替える場合

`upload-to-public-url.js`の`uploadToPublicUrl`関数の中身(Worker宛のPUTリクエスト部分)だけを、R2への直接アップロード処理に差し替えれば、呼び出し側(Buffer登録スクリプト等)は変更不要。

## 動作確認(2026-09-21実施)

- テストファイルのアップロード・取得：成功
- 実素材(`素材_v1/投稿4_結果画面の見方.png`)を`day7-1.png`としてアップロードし、ブラウザで画像表示を確認済み

## Buffer登録について(2026-09-21修正：MCP依存を解消)

当初「Buffer MCPはClaude Codeセッション内でしか呼べない」としていたが、確認したところBuffer公式のGraphQL API(`https://api.buffer.com/graphql`)は通常のBearerトークン認証で、MCPを介さず外部スクリプトから直接呼べることを実機確認した(接続・チャンネル取得・重複チェック・下書き作成・削除まで全て成功)。

そのため`buffer-client.js`はBuffer MCPを使わず、直接GraphQL APIを呼ぶ実装にした。これにより「重複チェック→登録」はClaude Codeを呼ばなくても、Node.jsスクリプト単体(将来的にはCloudflare Worker + Cron)で完結できる。

処理の流れ：
1. `findDuplicatePost`で対象チャンネル・同一テキストの予約/送信済みが無いか確認
2. 無ければ`upload-to-public-url.js`で素材を公開URL化
3. `createPost`で登録(IG/TikTok/YouTubeのみ。X/Threads/noteは対象外)
4. 失敗時のみばるへ報告。成功時は完了報告のみ

## 認証情報(追加)

- `BUFFER_API_KEY`: Bufferのパーソナルアクセスキー(権限：account:read・posts:read・posts:writeのみ、有効期限1年)。Windowsユーザー環境変数として登録済み。値はどこにも書き残していない。
- 将来Cloudflare Cronへ移行する際は、Cloudflare Workerの`secret_text`バインディング(今回`UPLOAD_SECRET`で使ったのと同じ仕組み)へ移す。

## 動作確認(2026-09-21・Buffer直接API)

- account取得・チャンネル一覧取得：成功(MCP経由と同じ結果と一致)
- 重複チェック(posts)：成功
- 予約登録(createPost、`saveToDraft:true`のドライラン)：成功→即削除し痕跡なし

## Day7 Instagram本登録(2026-09-21・完了)

- `register-day7.js`でDay7本文・画像2枚(day7-1.png／day7-2.png)を実登録。
- 重複チェック(`findDuplicatePost`)で既存投稿なしを確認 → 新規登録。
- 元の投稿計画日時(2026-09-17 12:15)は過去のため使用不可 → shareNow(即時投稿)に切り替え。
- 結果：Buffer post ID `6ab0d00e5a51e9fa48b510d0`、status `sent`、投稿URL https://www.instagram.com/p/Ddih2DllaM_/ 、エラーなし。

**この成功により、「人(ばる)がClaude Codeを呼ばないとBuffer登録できない」という制約は解消済み。** Node.jsスクリプト単体(`buffer-client.js`)でBuffer登録が完結することを実運用で確認した。

## 未実施(次のステップ)

- Codex制限解除後、このコード一式のレビューを依頼する
- **次の段階：Cloudflare Cron等からこの処理を無人実行できる形にする設計へ進める**(下記)
