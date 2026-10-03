# stage34｜毎日の反応確認の仕組み（2026-10-03）

ばるの依頼：「反応は毎日確認してください」。

## 仕組み

- スケジュール：毎日12時ごろ（Claudeのスケジュールタスク `sns-daily-reaction-check`。アプリが閉じていると、次に開いたときに実行）。2週間ごとの本文依頼のお知らせ（`sns-biweekly-content-batch`、毎月15日・29日）とは別。
- 手順（読み取りと記録だけ。投稿・承認・DB変更はしない）：
  1. `fetch-buffer-posts.js`：Buffer APIから、投稿済みの投稿と反応の数字（TikTok・YouTube Shorts・X）を保存。
  2. MetricoolのMCP（`getAnalyticsDataByMetrics`、brandId 6859578）：Threadsの数字（THPO02・03・06・08・09）。THPO08/09の項目名は未確認（表示回数と思われる数）。
  3. `collect-reactions.py`：`SNS集客/反応記録/反応データ.csv` に積み上げ、`反応記録/<日付>.md` にまとめ（媒体別、上位5件、下位3件、前回からの増加、質問あり/なし・フォロー誘導あり/なしの平均）。
  4. `check-posting-health.js`：失敗・予定を30分過ぎても未投稿・準備完了の残り日数。
- ばるへの報告：✅異常なし／⚠️要確認、媒体別の反応、気づき、準備完了の残り日数（7日分を切ったら⚠️）。

## 初回の記録（2026-10-03）と、数字についての訂正

- 直近14日の1投稿あたりの表示回数：Threads 133（13件）、TikTok 166（6件）、YouTube Shorts 285（6件）、X 1（2件、開始直後）。
- **訂正**：10/2に「YouTubeの9/30分は0回」と報告したが、YouTubeの数字は更新が約1日遅れるだけで、実際は987回（YouTube Shorts最多）だった。YouTube・TikTokの数字は最大1日遅れで更新される。stage33の分析（質問型・フォロー誘導の一文）の方向は変わらないが、YouTube Shortsの比較は、更新後の数字で見る。
- Instagramの数字は、Bufferの接続解除で消えたため、`instagram-metrics-20260930.md` に残した10件分のみ。
