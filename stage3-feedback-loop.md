# 分析結果フィードバック出力(Stage 3・2026-09-21)

## 構成

```
generate-feedback.js   … analyze-metrics.jsの結果を構造化フィードバックへ整形し、Supabaseへ保存
get-latest-feedback.js … ChatGPT/Claudeが最新フィードバックを読むための読み取り専用ヘルパー(--md でMarkdown出力)
```

## テーブル：`sns.feedback_reports`

| カラム | 説明 |
|---|---|
| generated_at | 生成日時 |
| analysis_period | 分析対象期間(投稿日時の最小〜最大) |
| sample_size | 全体サンプル数 |
| report | 構造化フィードバック本体(jsonb) |

「前回の分析結果」は`ORDER BY generated_at DESC LIMIT 1`で常に最新1件を取得できる。

## reportの構造

`summary` / `what_worked` / `what_underperformed` / `hypotheses` / `data_gaps` / `next_experiments`(最大3件) / `decisions`(続ける／試す／まだ判断しない) / `comparable_same_condition`(24h/72h/7日の同条件比較) / `sns_trend` / `sample_size` / `analysis_period`

**断定回避のルール**：グループごとのサンプル数が5件未満の場合、`confidence: "hypothesis"`を必ず付与し、事実として断定しない(`what_worked`/`what_underperformed`/`hypotheses`すべてに適用)。

## 実装中に見つけて直したバグ

- 投稿日時のソートに`Array.sort()`をそのまま使っていたため、Dateオブジェクトが文字列比較され`analysis_period`の範囲が正しく出ない不具合があった(数値比較に修正、実データで再検証済み)
- 全体サンプル数だけで「事実/仮説」を判定すると、個別項目(媒体別など)の実際のサンプル数と矛盾したメッセージになる問題があったため、summary文の表現を「媒体別・テーマ別の内訳はいずれもサンプル◯件未満」という正確な言い方に修正

## 動作確認(実データ6件)

Supabaseへの保存・読み取り、テスト実行で溜まった重複レコードの削除まで確認済み(最新1件のみ残存)。
