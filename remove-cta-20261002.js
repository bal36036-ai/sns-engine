// 2026-10-02 ばる承認：承認済みThreads 3件から「アプリストア公開に向けて開発中です。フォローしてお待ちください。」の一文を取り除く（反応の分析 stage33）。
// 変更する列：body_text のみ。古い本文は cta-removed-20261002-before.json に保存。
const fs = require("fs");
const { getPool } = require("./db-client");
const IDS = ["35f7ef20", "06503fed", "5c2ac479"];
const CTA = /\s*アプリストア公開に向けて開発中です。フォローしてお待ちください。\s*$/;
(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const log = [];
  try {
    for (const id8 of IDS) {
      const { rows } = await pool.query("SELECT id, status, body_text FROM sns.posts WHERE id::text LIKE $1 AND target_sns = 'threads'", [`${id8}%`]);
      if (rows.length !== 1 || rows[0].status !== "ready") throw new Error(`${id8}: 対象外`);
      if (!CTA.test(rows[0].body_text)) throw new Error(`${id8}: 一文が末尾にない`);
      const next = rows[0].body_text.replace(CTA, "");
      console.log(id8, "…" + next.slice(-50).replace(/\n/g, " "));
      log.push({ id: rows[0].id, before: rows[0].body_text, after: next });
      if (apply) await pool.query("UPDATE sns.posts SET body_text = $2 WHERE id = $1 AND status = 'ready'", [rows[0].id, next]);
    }
    if (apply) fs.writeFileSync("cta-removed-20261002-before.json", JSON.stringify(log, null, 1), "utf8");
    console.log(apply ? "反映" : "dry-run");
  } finally { await pool.end(); }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
