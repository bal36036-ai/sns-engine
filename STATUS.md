# SNS運用エンジン 現在地

更新：2026-10-18（隔離コピー。以下の節約変更は本番未適用）

- 実装・ローカル検証：投稿候補もBuffer配信同期候補もない回だけ、Vault読取前にdispatchを省略する移行SQLと切戻しSQLを用意。候補条件は既存JSと同じ。
- 検証：PGlite 56件・既存Buffer回帰16件に加え、通常のPostgreSQL 17.6で同じ56件と複数プロセス競合4件、計60件が成功。実投稿・実dispatch・本番DB書込・push・Actions実行なし。
- レビュー：Codex自己レビュー済み。Claude Codeの限定読取レビューでブロッカーなし。追加テストは自己レビュー。
- 本番読取確認：正規Supabaseコネクタで所有者postgres・SECURITY DEFINER・BYPASSRLS・テーブル所有者を確認。記録済み本文とDB内の指紋比較が一致（本文・Vault値は取得なし）。
- 未完了：本番適用・pushは別承認待ち。正本の既存差分は要整理のため変更せず、このタスク専用コピーで実装。予備scheduleは無変更で、無料枠内は保証しない。
- 詳細・次の作業：`stage41-idle-dispatch-gate-20261018.md` の本番前注意を確認して適用可否を判断する。

- 正本：GitHub `bal36036-ai/sns-engine` / `main`（Private）。
- 実行：既存GitHub ActionsのscheduleとSupabaseからのcron-live。手動実行はdry-run。
- 完了：Bufferの受付・処理中・公開成功・失敗を区別。定期live処理で最終状態と公開URLを同期し、外部ID付き投稿は再送候補から除外。
- 完了：対象YouTube `632d3f47-d0a5-43f2-a49a-a2a99792662d` を、本人の今回限定承認に基づき重複確認後1回だけ再登録。公開成功・本文・14.501秒動画を実ページで確認。
- YouTube：https://www.youtube.com/watch?v=PMfZl8TQE7A
- TikTok：親が復旧した既存Buffer IDの状態のみ同期。再送なし。https://tiktok.com/@genba_apps/video/7696049056107416840
- 完了：過去Instagram5件の実公開ページを本文・日時で照合し証拠とURLを保存。公開確認とBuffer照合不可を別属性で保持。元status・登録結果・dry-run履歴を保持。
- 完了：NOT_FOUNDは未照合として扱い、停止中媒体の24時間以上前のIDだけ24時間後に再確認。有効媒体・最近の登録・進行中・本当の失敗は通常頻度で確認。
- 確認：回帰16テスト・実Postgres抽出条件テスト成功。即時再確認は対象0・エラー0・再送0。既存の公開条件・遅延停止・素材確認・重複確認・手動dry-run・Cron設定を維持。DBスキーマ・権限・認証は変更なし。
- 詳細は `stage40-buffer-delivery-recovery-20261013.md`。
- 通常運用確認：17:37 JSTのrun `38370472066` が修正コミット `6270141` で成功。processed/synced/unverified/errorsすべて空。5件は再確認待ち・証拠保持、回復2件の同ID成功状態を公開APIで確認。
