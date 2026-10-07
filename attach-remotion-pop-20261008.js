// 2026-10-08 ばる「Bで行こう」：Remotionの実画面版（曲B：明るいポップ）を、内容が同じ投稿2件に付ける。
// X 17869597（11/1 12:15）・Threads d4c9eccc（10/30 9:30）：本文はどちらも「入力順3本・61.1%／自動2本・91.7%」で、動画と同じ内容。
// 画像なし→動画1本。本文の最後に「音声：VOICEVOX Nemo」を足す。元の値は attach-remotion-pop-20261008-before.json。
// 使い方：node attach-remotion-pop-20261008.js [--apply]
const fs = require("fs");
const { getPool } = require("./db-client");
const URL = "https://sns-material-storage.gbapp.workers.dev/issue5-remotion-sortorder-real-pop-20261008.mp4";
const CREDIT = "音声：VOICEVOX Nemo";
const xWeight = (t) => [...t].reduce((w, ch) => { const c = ch.codePointAt(0); return w + ((c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2); }, 0);
(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const log = [];
  try {
    for (const [id8, sns] of [["17869597", "x"], ["d4c9eccc", "threads"]]) {
      const { rows } = await pool.query("SELECT id, status, media_urls, body_text FROM sns.posts WHERE id::text LIKE $1 AND target_sns = $2", [`${id8}%`, sns]);
      if (rows.length !== 1 || rows[0].status !== "ready" || rows[0].media_urls?.length) throw new Error(`${id8}: 対象外`);
      const r = rows[0];
      const text = sns === "x" ? `${r.body_text} ${CREDIT}` : `${r.body_text}\n\n${CREDIT}`;
      const size = sns === "x" ? xWeight(text) : [...text].length;
      if (size > (sns === "x" ? 280 : 500)) throw new Error(`${id8}: 長すぎる ${size}`);
      console.log(`${sns} ${id8}: 動画を付ける（文字 ${size}）`);
      log.push({ id: r.id, sns, before_media: r.media_urls, before_text: r.body_text });
      if (apply) await pool.query("UPDATE sns.posts SET media_urls = $2, body_text = $3 WHERE id = $1 AND status = 'ready'", [r.id, [URL], text]);
    }
    if (apply) fs.writeFileSync("attach-remotion-pop-20261008-before.json", JSON.stringify(log, null, 1), "utf8");
    console.log(apply ? "反映" : "dry-run");
  } finally { await pool.end(); }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
