# stage27｜素材待ち48件の投稿文清書（2026-09-27）

対応：Claude Code（編集長）。経緯：[Issue #5 依頼](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5851260955)（`chatgpt-request-20260927-media-topics.md`）→ [ChatGPT回答](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5851289888)（話題の方向性のみ）→ genba-copywriterで完成キャプションへ清書 → 編集長レビュー・反映。

## 経緯

素材待ち（`readiness_state=waiting_media`）48件（Instagram 18・TikTok 15・YouTube Shorts 15）は、タイトル分類がハリナビ「質問・意見募集」「困りごと・失敗例」に偏っていた。ChatGPTへ見直しを依頼したところ、48件の**話題の方向性**（Instagram向けはスライド構成メモ、TikTok/YouTube向けは短い場面描写）が返ってきたが、ChatGPT自身が「本文の方向性だけの案。実画面の数値・テロップ・素材構成は制作時に必ず現行UIと照合してください」と明記しており、そのままDBの`body_text`へ書ける完成キャプションではなかった。

方向性メモを実際の投稿文（キャプション）に清書する作業は「ChatGPT起点の投稿文の編集」にあたるため、genba-copywriterへ依頼した。

## genba-copywriterへの依頼と結果

48件分の`{id, app, sns, title, current_body, direction}`を渡し、既存の投稿文の書式（Instagram=複数段落＋ハッシュタグ3〜4、TikTok/YouTube=短文＋VOICEVOXクレジット、ハリナビは安全注意必須、フォロー呼びかけは3件に1件まで）を守って清書するよう依頼。48件全件分のキャプションが返ってきた。

## 編集長レビュー（反映前）

機械チェックで4件を発見・修正：

- TikTok/YouTube動画のVOICEVOXクレジット漏れ4件（`683ebc74`・`15adcec0`・`7e130a51`・`47e016be`）→ 末尾に「音声：VOICEVOX Nemo」を追加
- フォロー呼びかけの比率が48件中18件（37.5%）で目安（3件に1件≒33%）をわずかに超過 → 2件（`8022be0b`・`a2f04c5c`、いずれもキリドリYouTube）からCTA行を削除し、16件（33%）に調整

再チェックで全項目通過：

- 禁止語（テスター募集・URL誘導・「試せます」「使ってみて」・実績数字・安全断定）：0件
- 字数：Instagram/TikTok上限2,200字・YouTube上限5,000字に対し、いずれも余裕あり
- ハッシュタグ：Instagram 3〜4個・TikTok/YouTube 1〜3個、上限超過なし
- ハリナビ全18件に安全注意（「専門家」「一次照査」「動作確認用の例」等）あり
- 全既存投稿（履歴除く）との完全重複：0件

## 反映

`apply-20260927-media-captions.js`＋`apply-20260927-media-captions.json`（48件のid・body_text）。対象は`status=draft`・`readiness_state=waiting_media`・未投稿の投稿に限定し、`body_text`のみ更新。dry-runで48件の前後を確認後、`--apply`で反映。48件ともCOMMIT。

`readiness_state`は`waiting_media`のまま変更していない（画像・動画をまだ作っていないため）。予定日時・素材URL・他の列も変更なし。

## 次の作業

本文は固まったが、画像・動画の素材制作はまだ。次工程は、この48件の内容に合わせた画像（Instagram、genba-designer or 既存Pythonスクリプト）・ナレーション付き動画（TikTok/YouTube、VOICEVOX＋実アプリ画面）の制作。実画面との照合が必要なため、着手前にばるへ確認する。
