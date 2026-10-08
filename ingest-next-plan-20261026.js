// 2026-10-08 ばる承認（「いいよ」）：ChatGPTの10/26〜11/8企画の36件を、下書き（確認待ち）として sns.posts に入れる。
// 既存の予約には触らない（入れ替えは swap-next-plan-20261026.js で別に行う）。入れた時点では投稿されない（status=draft）。
// データ：next-plan-20261026-posts.json（build-next-plan-20261026-data.js で作成）
// 使い方：node ingest-content-reset-20261008.js [--apply]
const fs = require("fs");
const { getPool } = require("./db-client");
const rows = JSON.parse(fs.readFileSync(__dirname + "/next-plan-20261026-posts.json", "utf8"));
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|フォローして見守って|参考最大荷重|試せます|使ってみて|DMください/;
const xWeight = (t) => [...t].reduce((w, ch) => { const c = ch.codePointAt(0); return w + ((c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2); }, 0);

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const c = await pool.connect();
  let n = 0;
  try {
    await c.query("BEGIN");
    for (const r of rows) {
      const p = [];
      if (BANNED.test(r.body_text) || BANNED.test(r.title || "")) p.push("禁止表現");
      const size = r.sns === "x" ? xWeight(r.body_text) : [...r.body_text].length;
      const limit = { x: 280, threads: 500, tiktok: 2200, youtube: 5000 }[r.sns];
      if (size > limit) p.push(`長すぎる ${size}/${limit}`);
      if (r.sns === "youtube" && [...r.title].length > 95) p.push("YouTubeタイトルが95字超");
      if (r.app === "harinavi" && !r.body_text.includes("専門家")) p.push("ハリナビに「専門家」がない");
      if ((r.sns === "tiktok" || r.sns === "youtube") && !r.body_text.includes("音声：VOICEVOX Nemo")) p.push("音声クレジットなし");
      const at = new Date(`${r.date}T${r.time}:00+09:00`);
      if (!(at.getTime() > Date.now() + 3600e3)) p.push("予定が近すぎる/過去");
      const dup = await c.query("SELECT id FROM sns.posts WHERE target_sns = $1 AND (md5(body_text) = md5($2) OR topic_id = $3)", [r.sns, r.body_text, r.topic_id]);
      if (dup.rowCount) p.push(`既にある ${dup.rows[0].id.slice(0, 8)}`);
      if (p.length) throw new Error(`${r.date} ${r.sns}: ${p.join(" / ")}`);
      if (apply) {
        await c.query(
          `INSERT INTO sns.posts (topic_id, target_app, target_sns, title, body_text, media_urls, scheduled_at, is_publishable, feature_published, status, readiness_state, scheduling_reason)
           VALUES ($1,$2,$3,$4,$5,'{}',$6,false,true,'draft','needs_review',$7)`,
          [r.topic_id, r.app, r.sns, r.title, r.body_text, at.toISOString(), JSON.stringify({ source: "chatgpt-plan-20261008-next-plan-1026", approved: "bal 2026-10-08 いいよ（2回目）", kind: r.kind })]
        );
      }
      n++;
    }
    await c.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? `登録 ${n}件（draft・確認待ち）` : `dry-run：${n}件が条件を満たす（--apply で登録）`);
  } catch (e) { await c.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
