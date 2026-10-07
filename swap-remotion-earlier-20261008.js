// 2026-10-08 ばる「ずいぶん先だね」：Remotion動画を付けた投稿を、10/9へ前倒しする。同じアプリ（キリドリ）の10/9の投稿と日時を入れ替える（どちらも準備完了のまま）。
// X：17869597（11/1 12:15）⇔ 10/9 12:15 のキリドリのX投稿／Threads：d4c9eccc（10/30 9:30）⇔ 10/9 9:30 のキリドリのThreads投稿
// 使い方：node swap-remotion-earlier-20261008.js [--apply]
const { getPool } = require("./db-client");
const J = (s) => new Date(new Date(s).getTime() + 9 * 3600e3).toISOString().slice(5, 16).replace("T", " ");
(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const [id8, sns, target] of [["17869597", "x", "2026-10-09T12:15:00+09:00"], ["d4c9eccc", "threads", "2026-10-09T09:30:00+09:00"]]) {
      const a = (await c.query("SELECT id, scheduled_at, target_app FROM sns.posts WHERE id::text LIKE $1 AND target_sns = $2 AND status = 'ready' FOR UPDATE", [`${id8}%`, sns])).rows[0];
      const b = (await c.query("SELECT id, scheduled_at, target_app, left(body_text,30) b FROM sns.posts WHERE target_sns = $1 AND status = 'ready' AND scheduled_at = $2 AND is_historical = false FOR UPDATE", [sns, target])).rows;
      if (!a || b.length !== 1) throw new Error(`${sns}: 入れ替え相手が見つからない（${b.length}件）`);
      if (b[0].target_app !== a.target_app) throw new Error(`${sns}: アプリが違う`);
      console.log(`${sns}: ${id8} ${J(a.scheduled_at)} → ${J(b[0].scheduled_at)}／${b[0].id.slice(0, 8)}（${b[0].b}…）→ ${J(a.scheduled_at)}`);
      if (apply) {
        await c.query("UPDATE sns.posts SET scheduled_at = $2 WHERE id = $1", [b[0].id, a.scheduled_at]);
        await c.query("UPDATE sns.posts SET scheduled_at = $2 WHERE id = $1", [a.id, b[0].scheduled_at]);
      }
    }
    await c.query(apply ? "COMMIT" : "ROLLBACK"); console.log(apply ? "反映" : "dry-run");
  } catch (e) { await c.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
