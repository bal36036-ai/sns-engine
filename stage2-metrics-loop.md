# 投稿後メトリクス自動取得・分析ループ(Stage 2・2026-09-21)

## 構成

```
fetch-metrics.js  … Buffer APIから投稿後メトリクスを取得し、sns.post_metricsへ履歴保存
analyze-metrics.js … 蓄積されたメトリクスと投稿属性を突き合わせ、構造化した分析結果を出力
```

## テーブル：`sns.post_metrics`

1行=1回の取得(スナップショット)。最新値だけでなく**推移を追える設計**。

| カラム | 説明 |
|---|---|
| post_id | `sns.posts`への外部キー |
| external_post_id | Buffer側の投稿ID |
| fetched_at / fetched_at_hour | 取得日時(時間単位でバケット化) |
| hours_since_post | 投稿からの経過時間(時間) |
| metrics | jsonb。媒体差を吸収した共通キー(views/reach/impressions/likes/comments/shares/saves/reactions/engagementRate/clicks/averageTimeWatched/totalTimeWatched/viewers)。取得不可はnull |
| metrics_updated_at | Buffer側の最終更新時刻 |

**冪等性**：`(post_id, fetched_at_hour)`にユニーク制約。同じ投稿・同じ1時間帯の再取得はUPSERTで上書き、重複行は作らない(実機テストで2回連続実行し、行数が増えないことを確認済み)。

**エラー処理**：1件の取得失敗が他の投稿の処理を止めない。失敗した投稿の既存`post_metrics`行は一切変更しない(新規追加のみ行う設計のため、失敗時は単にスキップされる)。

## Buffer APIキーの権限追加

メトリクス取得には`insights:read`権限が必要だったが、Freeプランは**キーを1つしか保持できない**(新規作成には有料プランが必要)ため、既存キーを取り消してから`insights:read`を含む新しいキーを発行し直した。GitHub Actions Secretsも同時に更新済み(値は表示・記録していない)。

## 分析の比較設計

- 「投稿からの経過時間」でスナップショットを**24h/72h/7日**の窓に割り当てて比較(単純な数値の大小だけで判断しない)
- 各投稿属性(媒体・投稿日時・曜日・時間帯・画像/動画・テーマ=topic_id・対象アプリ・本文の長さ・フックの種類)とメトリクスを関連付け
- 出力は「伸びた/弱かった/仮説/データ不足/次回試す候補」の構造化形式。**分析結果から自動で投稿内容を変更したり本番投稿したりする処理は実装していない**(スクリプトは読み取り専用の分析のみ)

## 動作確認結果(実データ・2026-09-21)

1. **紐付けできた投稿数**：6件(Buffer実投稿と直接一致した`buffer_matched`の6件全て)
2. **取得できた指標**：views・reach・comments・shares・reactions・engagementRateは概ね取得可(0またはnullを含む)。impressions・likes・saves・clicks・viewers・averageTimeWatched/totalTimeWatchedは媒体によって取得不可(null)が多い(Buffer側の提供範囲の制約)
3. **メトリクス履歴の保存**：6件とも保存成功。2回連続実行して重複行が作られないこと(冪等性)を確認済み
4. **24h/72h/7日比較**：**一部可能**。72h窓には3件(legacy-主要3のIG/TikTok/YouTube、経過80.5h)、7d窓には1件(legacy-主要2、経過196.7h)が該当。24h窓は該当データなし(該当する経過時間の投稿が無い)
5. **現時点で見える傾向(仮説段階)**：
   - TikTok(legacy-主要3、経過80.5h時点でviews104・reach97)が、同時期のInstagram(views2)・YouTube(views10)より明確に反応が多い
   - ただし**件数が少なすぎるため断定はできない**
6. **データ不足で判断できない項目**：
   - 各投稿のメトリクス取得が今回1回のみのため、**時間経過による推移比較はまだできない**(今後定期的に取得して蓄積する必要がある)
   - サンプル数(6件)が少なく統計的な結論には不十分
   - フォロワー数などアカウント側の条件も投稿間で変化しており、完全な比較条件は揃っていない
   - 過去投稿のため`media_urls`が記録されておらず、画像/動画の別による比較は今回は信頼できない(今後の新規投稿からは正しく記録される)

## 変更していないもの

- GitHub Actionsのlive設定：変更なし(引き続きdry-run固定)
- 分析結果から自動で投稿内容や投稿予定を変更する機能：未実装(意図的に見送り)
