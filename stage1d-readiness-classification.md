# 未投稿16件の状態分類(Stage 1d・2026-09-21)

## 設計

`status`(draft/ready/...)とは別に`readiness_state`カラムを追加。「次に何をすべきか」を表す分類で、statusは変更しない。

分類ロジック(`classify-readiness.js`、優先順位順)：
1. `historical` … 履歴データ(is_historical=true)
2. `waiting_channel` … X/Threads等、自動投稿経路(Buffer)が未接続の媒体
3. `waiting_media` … 画像/動画が無い(自動化対象媒体のみ判定)
4. `needs_review` … 公開可否false・未公開機能・重複疑い
5. `waiting_schedule` … 内容・素材は揃っているが投稿日時未定
6. `ready_candidate` … 全て揃っている

`promote-to-ready.js`にも「自動投稿経路が未接続の媒体はready昇格禁止」ガードを追加(実機テストで拒否を確認済み)。X/Threadsは`readiness_state`上も、`promote-to-ready.js`の実行結果としても、**Instagram/TikTok/YouTube用Cronに拾われる経路が無い**ことを二重に保証。

## 全体件数(36件中)

| readiness_state | 件数 |
|---|---|
| historical | 20 |
| waiting_channel | 10 |
| waiting_media | 4 |
| waiting_schedule | 2 |
| needs_review | 0 |
| ready_candidate | 0 |

## Day9(legacy-主要5)の詳細

- **不足している素材**：PDF/Excel出力機能の操作動画(またはスクリーンショット)
- **自動生成可能か**：**不可**。過去にCodexでのブラウザ操作録画を試みたが、安定した動画品質(fps・ビットレート)が得られず実機撮影が必要という結論が出ている(`運用メモ_20260918.md`参照)。エンジン単体では生成できない
- **生成できれば自動で次工程へ進められるか**：**はい**。素材ができて`media_urls`を設定すれば、`classify-readiness.js`の再実行だけで`waiting_media`→(日時設定後)`waiting_schedule`→`ready_candidate`へ自動的に進む

## Day10(legacy-主要6)の詳細

- **Instagram・TikTok**：既存の`素材_v1/投稿6_一番面倒なのはどれ.png`を今回公開URL化し、`media_urls`へ反映済み → **`waiting_schedule`まで前進**(あとは投稿日時を決めるだけ)
- **YouTube**：静止画では投稿できない(Buffer仕様上YouTubeは動画必須)。動画素材が無いため`waiting_media`のまま
  - 自動生成可能か：**不可**(動画制作が必要)
  - 生成できれば：**はい**、同様に自動で次工程へ進む

## 今後の運用イメージ

1. Day9のPDF/Excel録画、Day10のYouTube動画ができたら、`media_urls`を更新
2. `classify-readiness.js`を再実行 → 自動的に`waiting_schedule`または`ready_candidate`へ分類が進む
3. 投稿日時が決まったものは`promote-to-ready.js`で`ready`へ(内容・素材・公開可否・重複の4点を自動チェック)
4. GitHub Actions(dry-run)が候補として検知することを確認してから、live投稿を検討

## 変更していないもの

- GitHub Actionsのlive設定：変更なし(引き続きdry-run固定)
- 履歴20件：一切触れていない
