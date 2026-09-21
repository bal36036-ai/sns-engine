const { getPool } = require("./db-client");

async function main() {
  const pool = getPool();
  const results = {};

  try {
    // 1. 接続確認
    const who = await pool.query("SELECT current_user, current_database();");
    results.connected_as = who.rows[0];

    // 2. テスト投稿候補を作成(draft)
    const insertRes = await pool.query(
      `INSERT INTO sns.posts (target_app, target_sns, body_text, media_urls, is_publishable, feature_published, status)
       VALUES ('test-app', 'instagram', 'DB接続テスト用の投稿候補', ARRAY['https://example.com/test.png'], true, true, 'draft')
       RETURNING id, status;`
    );
    const postId = insertRes.rows[0].id;
    results.inserted = insertRes.rows[0];

    // 3. 投稿対象の取得(draft状態のものを取得)
    const candidates = await pool.query(
      `SELECT id, target_sns, body_text, status FROM sns.posts WHERE status = 'draft' AND id = $1;`,
      [postId]
    );
    results.fetched_candidate = candidates.rows[0];

    // 4. 重複チェック結果の保存 → ready へ
    await pool.query(
      `UPDATE sns.posts
       SET duplicate_check = $2, status = 'ready'
       WHERE id = $1;`,
      [postId, JSON.stringify({ checked_at: new Date().toISOString(), result: "none" })]
    );

    // 5. scheduled へ(未来日時)→ Buffer post ID保存 → sent へ
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    await pool.query(
      `UPDATE sns.posts SET scheduled_at = $2, status = 'scheduled' WHERE id = $1;`,
      [postId, future]
    );
    await pool.query(
      `UPDATE sns.posts
       SET status = 'sent', external_service = 'buffer', external_post_id = 'TEST_BUFFER_ID_123',
           post_result = $2
       WHERE id = $1;`,
      [postId, JSON.stringify({ url: "https://example.com/posted", sentAt: new Date().toISOString() })]
    );

    // 6. エラー内容の保存テスト(別レコードでfailedパターンも確認)
    const failRes = await pool.query(
      `INSERT INTO sns.posts (target_app, target_sns, body_text, media_urls, is_publishable, feature_published, status)
       VALUES ('test-app', 'instagram', 'DB接続テスト(失敗パターン)', ARRAY['https://example.com/test2.png'], true, true, 'failed')
       RETURNING id;`
    );
    const failId = failRes.rows[0].id;
    await pool.query(`UPDATE sns.posts SET error_detail = 'テスト用エラーメッセージ' WHERE id = $1;`, [failId]);

    // 7. 最終状態の確認
    const final = await pool.query(
      `SELECT id, status, external_post_id, post_result, duplicate_check, error_detail
       FROM sns.posts WHERE id IN ($1, $2) ORDER BY created_at;`,
      [postId, failId]
    );
    results.final_states = final.rows;

    // 8. 他スキーマ(public、リースナビ側)へアクセスできないことを確認
    try {
      await pool.query("SELECT count(*) FROM public.vendors;");
      results.public_schema_access = "アクセスできてしまった(要修正)";
    } catch (e) {
      results.public_schema_access = `拒否された(正常): ${e.message}`;
    }

    // 9. 後片付け(テストデータ削除)
    await pool.query(`DELETE FROM sns.posts WHERE id IN ($1, $2);`, [postId, failId]);
    results.cleanup = "done";

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
