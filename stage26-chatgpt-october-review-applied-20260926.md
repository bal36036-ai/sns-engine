# stage26｜ChatGPT見直し案（10月後半Threads 36件）の反映（2026-09-26）

対応：Claude Code（編集長）。依頼：[Issue #5コメント](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5841979919)、`chatgpt-request-20260926-october-review.md`。回答：[Issue #5コメント](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5842643220)（2026-09-26 03:09 JST、ChatGPT）。

## 編集長レビュー（反映前に実施）

DBの対象36件（`target_sns=threads`・`scheduled_at>=2026-10-10`・`topic_id like 'cal-%'`）とChatGPT案のIDが完全一致することを確認。次を機械チェック：

- 禁止語（テスター募集・DM・URL誘導・「試せます」「使ってみて」・実績数字・「業界初」等・安全断定）：0件
- 全既存投稿（履歴除く）との完全重複：0件
- 最長文字数：115字（Threads上限500字に対し余裕あり）
- フォロー呼びかけ（「アプリストア公開に向けて開発中です。」等）：11/36件（約31%、3件に1件の目安どおり）
- 質問で終わる投稿にCTAが続く形：0件（質問形は文中の引用のみで、投稿末尾が質問のものにはCTAを付けていない）

内容も、9/26朝の指摘（ハリナビの話が偏る・「考えています」で終わる・具体的な場面が少ない）に沿って、単位の読み違い・版管理・再計算時の差分・現場の会話などへ切り口を広げていることを確認。反映して問題ないと判断した。

## 反映

`apply-20260926-chatgpt-october-revisions.js`（対象36件のIDと本文を`.json`に固定し、`target_sns=threads`・`status=draft`・`readiness_state=needs_review`・未投稿であることを再確認してから`body_text`のみ更新）。dry-runで36件の前後を確認後、`--apply`で反映。36件ともCOMMIT。`status`・`readiness_state`・素材・予定日時など他の列は変更していない。

## 対象外・未対応

- Instagram/TikTok/YouTube Shorts の未制作33件（10/10以降）の話題配分見直しは、ChatGPTから方向性の提案のみ（具体的な本文案なし）。素材制作の依頼は別途行う。
- X・note（`waiting_channel`）は対象外。
- 反映後の一括ready化はしていない（ChatGPTの推奨どおり）。承認は既存の運用フロー（ばる確認→ready化）を維持。
