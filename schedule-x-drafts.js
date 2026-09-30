// Xの下書き（waiting_channel・日時未定）に、投稿枠（毎日12:15、1日1件）を割り当てて、確認待ち（needs_review）にする。
// 前提：buffer-channels.js の CHANNEL_MAP.x に、BufferのXチャンネルIDが入っていること（入っていなければ何もせず止まる）。
// 順番：topic_id の日付順。Xの文字数（Xの数え方：日本語は1文字=2、上限280）を超える下書きは対象外にして報告する。
// 変更する列：scheduled_at・readiness_state のみ。本文・公開フラグ・statusは変更しない（ready化はばるの承認後）。
// 使い方：node schedule-x-drafts.js        … dry-run
//         node schedule-x-drafts.js --apply … 反映

const { getPool } = require("./db-client");
const { CHANNEL_MAP, AUTOMATED_SNS } = require("./buffer-channels");

const SLOT = "12:15";
const MIN_LEAD_MS = 3600e3;

function xWeight(text) {
  let w = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    w += (c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2;
  }
  return w;
}
const jstDay = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

async function main() {
  if (!CHANNEL_MAP.x || !AUTOMATED_SNS.includes("x")) throw new Error("BufferのXチャンネルIDが未登録です（buffer-channels.js の CHANNEL_MAP.x）");
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: drafts } = await client.query(
      "SELECT id, topic_id, body_text FROM sns.posts WHERE target_sns = 'x' AND status = 'draft' AND readiness_state = 'waiting_channel' AND external_post_id IS NULL AND is_historical = false ORDER BY topic_id, id FOR UPDATE"
    );
    const { rows: taken } = await client.query("SELECT scheduled_at FROM sns.posts WHERE target_sns = 'x' AND scheduled_at IS NOT NULL AND status IN ('ready','scheduled','sent','draft')");
    const usedDays = new Set(taken.map((r) => jstDay(new Date(r.scheduled_at).getTime())));
    let day = jstDay(Date.now());
    let count = 0, tooLong = 0;
    for (const d of drafts) {
      const weight = xWeight(d.body_text);
      if (weight > 280) { tooLong++; console.log(`  対象外（長すぎる ${weight}/280）: ${d.id.slice(0, 8)} ${d.topic_id}`); continue; }
      let at;
      for (;;) {
        at = new Date(`${day}T${SLOT}:00+09:00`).getTime();
        if (!usedDays.has(day) && at >= Date.now() + MIN_LEAD_MS) break;
        day = addDays(day, 1);
      }
      usedDays.add(day);
      count++;
      if (apply) {
        const res = await client.query("UPDATE sns.posts SET scheduled_at = $2, readiness_state = 'needs_review' WHERE id = $1 AND status = 'draft' AND readiness_state = 'waiting_channel'", [d.id, new Date(at).toISOString()]);
        if (res.rowCount !== 1) throw new Error(`${d.id}: 更新件数 ${res.rowCount}`);
      }
    }
    console.log(`Xの下書き ${drafts.length}件：日時を割り当て ${count}件／長すぎて対象外 ${tooLong}件`);
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "COMMIT" : "dry-run：変更なし（--apply で更新）");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error("ERROR:", error.message); process.exit(1); });
