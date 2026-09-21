# workflow_dispatch完全ロックダウン・3段階猶予(Stage 8・2026-09-21)

## 修正1：workflow_dispatchからlive経路を完全に削除

- `.github/workflows/cron-engine.yml`から`workflow_dispatch.inputs.live`自体を削除(`workflow_dispatch: {}`のみ)
- 実行条件を`github.event_name == 'schedule'`の1点のみで判定するよう単純化
- **手動実行(workflow_dispatch)には、どんな入力を与えてもliveへ進む経路が存在しない**(GitHub Actions UI上にもlive指定欄自体が表示されなくなる)
- scheduleトリガーだけがlive、workflow_dispatchは常にdry-run、という完全分離をコードレベルで保証

## 修正2：予約時刻超過の猶予を3段階化

GitHub Actionsのscheduleは遅延することがあり、「30分経過で即expired」では正常投稿まで巻き込む恐れがあったため、以下へ変更：

| 遅延幅 | 扱い |
|---|---|
| 0〜60分 | 通常投稿として処理(Cronの通常のブレの範囲として許容) |
| 60〜180分 | `needs_review`(遅延投稿ポリシーとして一旦停止、人の確認を挟む) |
| 180分超 | `expired`(見逃されたとみなし、安全側で自動投稿しない) |

現在の投稿頻度(1日あたり数件程度)と、GitHub Actionsの一般的な遅延傾向(通常は数分、負荷時でも1時間を大きく超えることは稀)を踏まえ、60分を「通常範囲」の上限、180分を「完全に見逃された」判断ラインとした。

## 実データでの境界値テスト(3パターンとも想定どおり)

| テストケース | 結果 |
|---|---|
| 30分遅れ | `dry_run_ok`(通常投稿として処理) |
| 100分遅れ | `needs_review`(遅延投稿ポリシーにより要確認) |
| 200分遅れ | `expired`(猶予超過) |

テストデータは確認後すべて削除済み。

## 再確認結果(ご指示の6項目)

| 項目 | 結果 |
|---|---|
| 手動workflow_dispatchからlive投稿が絶対にできない | ✅ コード上、live入力自体が存在せず、`event_name`判定でscheduleのみがlive経路 |
| scheduleだけがlive経路を持つ | ✅ 上記のとおり |
| 予定時刻前は処理されない | ✅ `scheduled_at <= now()`のSELECTフィルタ(前回実証済み、今回も維持) |
| 多少Cronが遅延しても正常投稿できる | ✅ 0〜60分は通常投稿として処理(今回実証) |
| 大幅に遅延した投稿は安全側で止まる | ✅ 180分超で`expired`(今回実証)、60〜180分は`needs_review`で一旦停止(今回実証) |
| 二重投稿防止は維持される | ✅ ロジック変更なし(`claimed_at`ロック・`external_post_id`確認・Buffer側重複確認は今回のスコープ外で変更していない) |
| Day10 YouTubeの予定日時は変更しない | ✅ 6件すべて変更なしを確認(`2026-09-21 21:30 UTC` = `2026-09-22 06:30 JST`のまま) |

## live化状況

修正をpush済み。初回自動本番投稿(Day10 YouTube、9/22 06:30 JST以降の最初のCron実行)は有効のまま待機。
