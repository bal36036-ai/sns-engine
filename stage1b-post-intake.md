# 投稿候補投入フロー(Stage 1b・2026-09-21)

## 1. 投稿候補の登録方法

- `ingest-post.js`：ChatGPT/Claudeが作った投稿案を渡すと、`sns.posts`へ**必ず`draft`から**登録する
  - CLI例：`node ingest-post.js '{"topicId":"...", "targetApp":"kiridori", "targetSns":"instagram", "bodyText":"...", "mediaUrls":[...], "isPublishable":true, "featurePublished":true}'`
  - 対象アプリ・対象SNS・本文・タイトル・画像/動画URL・予約日時・公開可否・開発中/公開済み(feature_published)・投稿状態(常にdraft開始)を登録
- `promote-to-ready.js`：draftの投稿を「内容確認・素材確認・公開可否確認・重複確認」の4点すべて通過した場合のみ`ready`へ進める。1つでも欠けていれば`draft`のまま、`guard_reason`に理由を記録
- `migrate-markdown.js`：既存Markdown(`投稿本文_媒体別_v1_20260911.md`)からの初期移行専用

## 2. 重複防止方式

- **DB制約レベル**：`(topic_id, target_sns)`にユニークインデックス(topic_id指定時)。同じネタ・同じSNSは1行しか作れない
- **アプリレベル**：topic_id未指定の場合は本文の完全一致(md5)で事前チェック
- **ready昇格時**：Buffer側へ実際に問い合わせて重複確認(過去に同一本文が送信/予約されていないか)
- **Cron実行時**：processOne内でも再度Buffer側の生きた重複チェックを実施(3重のチェック)

## 3. draft→readyの条件(すべて必須)

1. 内容確認：本文が空でない
2. 素材確認：自動化対象SNS(IG/TikTok/YouTube)は`media_urls`が1件以上(未完成なら`draft`のまま留まる)
3. 公開可否確認：`is_publishable = true` かつ `feature_published = true`
4. 重複確認：Buffer側に同一本文の既存投稿が無い

## 4. Markdownからの移行結果

`投稿本文_媒体別_v1_20260911.md`から**36件を`draft`として移行**(主要1〜6 × 5媒体=30件、短文A〜C × 2媒体=6件)。エラー・重複スキップともに0件。

**注意点**：
- note記事1・2、短文D(差し替え前の例文)は意図的にパーサー対象外(note/短文Dの構造が定型と異なるため)。必要なら個別に`ingest-post.js`で登録
- **移行した36件の多くは、Day1〜Day5として過去に実際投稿済みの履歴内容**。`draft`のまま留め、レビューなしで`ready`へは進めていない(誤って再送されないようにするため)
- `topic_id`には`legacy-`を付け、履歴データであることを区別できるようにしている

## 5. dry-runで拾えた件数

- **移行した36件(履歴データ)**：意図的に`draft`のまま。dry-run対象は`ready`/`scheduled`のみのため、**0件**(想定どおり。過去分が誤って自動処理されることはない)
- **動作確認用の合成テストデータ**：`ingest-post.js`で登録→`promote-to-ready.js`で`ready`化→`cron-engine.js`(dry-run)で**1件を正しく検知**(`dry_run_ok`)。確認後にテストデータは削除済み

## 画像/動画が未完成の場合の扱い

`media_urls`を空配列のまま`draft`で登録可能。`promote-to-ready.js`が素材未完成を検知して`ready`へ進めない(`guard_reason: 素材未完成(media_urlsが空)`)。素材ができ次第、`media_urls`を更新して再度`promote-to-ready.js`を実行する運用。

## 現在の状態

- GitHub Actionsの状態は変更なし(schedule実行は引き続きdry-run固定)
- `sns.posts`には36件の履歴draftが存在。すべて`draft`のまま(本番投稿に影響しない)
