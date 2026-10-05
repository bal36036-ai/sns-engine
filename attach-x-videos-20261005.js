// 2026-10-05 ばる「全部それでいいよ」：Xの投稿の一部を、同じ話題（topic_id）の動画（TikTok・YouTube用に作成済みの声つき動画）に切り替える。
// 画像と動画の反応をくらべるため、ハリナビ4件・キリドリ4件（10/6・7・10・11・14・15・18・19）。画像はやめて動画1本にする（Xは画像と動画を同時に付けられない）。
// 本文の最後に、動画の声の表記「音声：VOICEVOX Nemo」を足す。元の画像は x-videos-20261005-before.json に保存（戻せる）。
// 使い方：node attach-x-videos-20261005.js [--apply]
const fs = require("fs");
const https = require("https");
const { getPool } = require("./db-client");
const DAYS = ["2026-10-06", "2026-10-07", "2026-10-10", "2026-10-11", "2026-10-14", "2026-10-15", "2026-10-18", "2026-10-19"]; // ハリナビ4日（6・10・14・18）とキリドリ4日（7・11・15・19）
const CREDIT = "音声：VOICEVOX Nemo";
const jst = (d) => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const xWeight = (t) => [...t].reduce((w, ch) => { const c = ch.codePointAt(0); return w + ((c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2); }, 0);
const head = (url) => new Promise((resolve) => {
  const req = https.request(url, { method: "HEAD", timeout: 15000 }, (res) => resolve({ ok: res.statusCode === 200 && /^video\//.test(res.headers["content-type"] || ""), size: Number(res.headers["content-length"] || 0) }));
  req.on("error", () => resolve({ ok: false })); req.on("timeout", () => { req.destroy(); resolve({ ok: false }); }); req.end();
});
(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const client = await pool.connect(); const log = [];
  try {
    await client.query("BEGIN");
    const { rows: xs } = await client.query("SELECT id, topic_id, scheduled_at, body_text, media_urls FROM sns.posts WHERE target_sns = 'x' AND status = 'ready' AND is_historical = false AND scheduled_at > now() + interval '1 hour' ORDER BY scheduled_at FOR UPDATE");
    for (const x of xs.filter((r) => DAYS.includes(jst(r.scheduled_at)))) {
      const { rows: vs } = await client.query("SELECT media_urls FROM sns.posts WHERE topic_id = $1 AND target_sns IN ('tiktok','youtube') AND cardinality(media_urls) > 0 AND media_urls[1] ~* '\.mp4' ORDER BY (target_sns = 'youtube') DESC LIMIT 1", [x.topic_id]);
      if (!vs.length) { console.log(`${x.id.slice(0, 8)} ${jst(x.scheduled_at)}: 同じ話題の動画なし → そのまま`); continue; }
      const url = vs[0].media_urls[0];
      const h = await head(url);
      if (!h.ok || h.size > 500e6) { console.log(`${x.id.slice(0, 8)}: 動画に到達できない／大きすぎる → そのまま`); continue; }
      const text = x.body_text.includes(CREDIT) ? x.body_text : `${x.body_text} ${CREDIT}`;
      if (xWeight(text) > 280) { console.log(`${x.id.slice(0, 8)}: 文字数が超える（${xWeight(text)}） → そのまま`); continue; }
      console.log(`${x.id.slice(0, 8)} ${jst(x.scheduled_at)} ${x.topic_id}: 画像${x.media_urls.length}枚 → 動画 ${url.split("/").pop()}（${(h.size / 1e6).toFixed(1)}MB、文字 ${xWeight(text)}/280）`);
      log.push({ id: x.id, before_media: x.media_urls, before_text: x.body_text, after_media: [url], after_text: text });
      if (apply) await client.query("UPDATE sns.posts SET media_urls = $2, body_text = $3 WHERE id = $1 AND status = 'ready'", [x.id, [url], text]);
    }
    if (apply) fs.writeFileSync("x-videos-20261005-before.json", JSON.stringify(log, null, 1), "utf8");
    await client.query(apply ? "COMMIT" : "ROLLBACK"); console.log(`対象 ${log.length}件 ${apply ? "（反映）" : "（dry-run）"}`);
  } catch (e) { await client.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { client.release(); await pool.end(); }
})();
