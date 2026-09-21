# 履歴データ整理(Stage 1c・2026-09-21)

## スキーマ変更

`sns.posts`に以下を追加：
- `is_historical`(boolean)：trueなら`ready`/`scheduled`/`sent`への昇格を**DBトリガーで強制ブロック**(+アプリ側`promote-to-ready.js`でも二重チェック、実機テスト済み)
- `historical_confirmed`：`buffer_matched` / `manual_record` / `historical_only_unverified` / null
- `matched_external_post_id` / `matched_posted_at` / `matched_external_link`：Bufferの実投稿と紐付いた場合のみ記録

## 分類ロジック

1. **buffer_matched**：Buffer APIの送信済み投稿(`status=sent`)と本文が完全一致 → 投稿ID・日時・URLを紐付け
2. **manual_record**：X/Threads(Buffer未接続のため照合不可)のうち、`現状整理_v1_20260908.md`の日付付きログで「投稿完了」と明記されているもののみ
3. **historical_only_unverified**：その日のサイクル自体は完了しているが、この行の文言自体は実際には使われなかった(計画書上の未使用バリエーション。例：TikTok/YouTube用に別途用意されていたが実際はInstagram用キャプションが流用された、動画化しなかったため未使用、など)。個別に根拠を確認したうえで分類(推測での一括処理はしていない)
4. 上記いずれにも該当しないもの → **is_historical=falseのまま**(本当に未投稿の候補として保持)

途中で発見した問題：移行時のMarkdown抽出で、TikTok/YouTube本文に「YouTube Shorts タイトル案:」以降が誤って混入していたため、該当12件を修正してから照合をやり直した。

## 結果

| 分類 | 件数 |
|---|---|
| buffer_matched(Buffer実投稿と直接一致) | 6件 |
| manual_record(書面記録で確認できたX/Threads) | 6件 |
| historical_only_unverified(その日は完了済みだがこの行は未使用) | 8件 |
| **履歴データ合計(is_historical=true)** | **20件** |
| **本当に未投稿の候補(is_historical=false)** | **16件** |

16件の内訳：legacy-主要4(x/threads・IG/TikTok/YouTubeは本日投稿済みだがX/Threadsは未投稿)、legacy-主要5(Day9・素材未完成のまま5媒体とも未投稿)、legacy-主要6(Day10・5媒体とも未予約のまま)、legacy-短文B(X/Threadsは予約設定のログはあるが送信完了の明記が無く未確認のまま保持)、legacy-短文C(送信記録なし)。

## 安全対策

- `is_historical=true`の行は、DBトリガー(`guard_post_transition`)が`scheduled`/`sent`への遷移を強制的に`needs_review`へ差し戻す
- `promote-to-ready.js`も冒頭でブロックする実装に変更、実機テストで拒否されることを確認済み
- 今回の整理作業で**36件のうち1件も再投稿していない**(GitHub Actionsのlive設定も変更なし)
