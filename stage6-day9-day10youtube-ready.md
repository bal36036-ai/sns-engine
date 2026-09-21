# Day9・Day10 YouTube 日時決定〜ready昇格〜dry-run(Stage 6・2026-09-21)

## 各媒体の投稿日時(JST)

| テーマ | 媒体 | 日時 | 時間帯 |
|---|---|---|---|
| Day10(legacy-主要6) | YouTube | 2026-09-22(火) 06:30 | 朝枠 |
| Day10(legacy-主要6) | TikTok | 2026-09-22(火) 12:15 | 昼枠(前回決定済み・変更なし) |
| Day10(legacy-主要6) | Instagram | 2026-09-22(火) 19:30 | 夜枠(前回決定済み・変更なし) |
| Day9(legacy-主要5) | TikTok | 2026-09-23(水) 06:30 | 朝枠 |
| Day9(legacy-主要5) | YouTube | 2026-09-23(水) 12:15 | 昼枠 |
| Day9(legacy-主要5) | Instagram | 2026-09-23(水) 19:30 | 夜枠 |

## 日時を決めた理由

- 各媒体を意図的に異なる時間帯(朝6:30/昼12:15/夜19:30)に割り当て、媒体別の反応比較がしやすいようにした
- Day10の3媒体は同日(9/22)に集中させたが、時間帯は重ねていない(朝=YouTube・昼=TikTok・夜=Instagram)
- Day9はDay10と同日にすると同一媒体(IG/TikTok)が1日に重複するため、1日ずらして9/23に設定
- 直近投稿(本日9/21のDay7 IG)から最短でも約9時間、最長で約38時間の間隔があり、当日中の連続投稿は発生しない
- **現状はサンプル数が少ないため「最適時間」ではなく「検証用の時間帯」として設定**(scheduling_reasonに明記)
- 決定理由はすべて`sns.posts.scheduling_reason`(jsonb)へ保存済み

## ready昇格前の再確認(verify-before-ready.js・新規実装)

対象6件すべてで以下を確認し、**全項目クリア(issues: 0件)**：
- media_urlsが有効かつCloudflare公開URL(`sns-material-storage.gbapp.workers.dev`)である
- 実際にHTTPアクセスできる(HEADリクエストで到達確認)
- 対象媒体に合う形式(YouTubeは動画必須の判定を含む)
- 本文が存在
- 公開可否true・未公開機能でない
- Buffer側に重複投稿がない(生きた確認)
- 投稿経路(Buffer接続チャンネル)が存在する媒体である

## 結果

1. **ready昇格した件数**：4件(Day9のIG/TikTok/YouTube + Day10 YouTube)。Day10 IG/TikTokは前回昇格済みのため対象外・変更なし
2. **dry-runで拾われた件数**：**6件全て**(Day10 IG/TikTok含む)。`dry_run_ok`・実登録なしを確認
3. **ガードで止まったものはあるか**：**無し**(errors: 0件)

## 本番投稿開始前に残っている作業

- ばるの最終承認(どのタイミングでlive投稿に切り替えるか)
- GitHub Actionsの`live`フラグは現状falseのまま(スケジュール実行は引き続きdry-run固定)
- 本番切り替え後の最初の数回は、結果を見ながら慎重に確認することを推奨
