// 2026-10-09 ばる「いいよ」：手元から始める会話劇 案1〜3（10/27・10/29・11/3）を、TikTok 18:15・YouTube 20:15 の枠に入れる。
// データ：next-videos-candidates-20261009.json（ChatGPT案1〜3の本文のまま。案2は16.1秒の短縮版）。動画：assets/issue5/opening-20261009/。
// 使い方：node schedule-videos-20261009.js          … 確認のみ
//         node schedule-videos-20261009.js --apply  … アップロード→下書き登録→準備完了（Buffer側の重複確認つき）
const fs = require("fs");
const path = require("path");
const { getPool } = require("./db-client");
const { uploadToPublicUrl } = require("./upload-to-public-url");
const { promoteToReady } = require("./promote-to-ready");

const items = JSON.parse(fs.readFileSync(path.join(__dirname, "next-videos-candidates-20261009.json"), "utf8")).filter((x) => x.proposed_date);
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|試せます|使ってみて|DMください/;
const KEY = { 案1: "a1", 案2: "a2", 案3: "a3" };

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const ids = [];
  try {
    for (const x of items) {
      const file = path.join(__dirname, x.video);
      if (!fs.existsSync(file)) throw new Error(`${x.plan}: 動画がない ${x.video}`);
      for (const [sns, at] of [["tiktok", `${x.proposed_date}T18:15:00+09:00`], ["youtube", `${x.proposed_date}T20:15:00+09:00`]]) {
        const body = sns === "tiktok" ? x.tiktok : x.youtube_body;
        const title = sns === "tiktok" ? x.title : x.youtube_title;
        if (BANNED.test(body) || BANNED.test(title)) throw new Error(`${x.plan} ${sns}: 禁止表現`);
        if (!body.includes("VOICEVOX Nemo")) throw new Error(`${x.plan} ${sns}: 音声クレジットなし`);
        if ([...title].length > 95) throw new Error(`${x.plan}: タイトルが長い`);
        const busy = await pool.query("SELECT id FROM sns.posts WHERE target_sns=$1 AND scheduled_at=$2 AND status IN ('ready','scheduled','draft')", [sns, at]);
        if (busy.rowCount) throw new Error(`${x.plan} ${sns}: ${at} の枠が埋まっている`);
        if (new Date(at).getTime() < Date.now() + 60 * 60e3) throw new Error(`${x.plan} ${sns}: 予定が近すぎる`);
      }
      console.log(`${x.plan} ${x.title}：TikTok ${x.proposed_date.slice(5)} 18:15／YouTube 20:15（${(fs.statSync(file).size / 1e6).toFixed(1)}MB）`);
    }
    if (!apply) { console.log("dry-run（--apply で実行）"); return; }
    for (const x of items) {
      const r = await uploadToPublicUrl(path.join(__dirname, x.video), `op-20261009-${KEY[x.plan]}.mp4`);
      const url = typeof r === "string" ? r : r.url;
      for (const [sns, at] of [["tiktok", `${x.proposed_date}T18:15:00+09:00`], ["youtube", `${x.proposed_date}T20:15:00+09:00`]]) {
        const body = sns === "tiktok" ? x.tiktok : x.youtube_body;
        const title = sns === "tiktok" ? x.title : x.youtube_title;
        const ins = await pool.query(
          `INSERT INTO sns.posts (topic_id, target_app, target_sns, title, body_text, media_urls, scheduled_at, is_publishable, feature_published, status, readiness_state, scheduling_reason)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,'draft','ready_candidate',$8) RETURNING id`,
          [`op-${x.proposed_date.replaceAll("-", "")}-${KEY[x.plan]}`, x.plan === "案2" ? "kiridori" : "brand", sns, title, body, [url], at,
            JSON.stringify({ source: "手元から始める会話劇 案1〜3（ChatGPT企画 2026-10-08、Claude制作 2026-10-09）", approved: "bal 2026-10-09 いいよ", plan: x.plan })]);
        ids.push(ins.rows[0].id);
      }
      console.log(`${x.plan}: アップロード・登録 ${url}`);
    }
  } finally { await pool.end(); }
  let ok = 0;
  for (const id of ids) { const r = await promoteToReady(id); if (r.ok) ok++; else console.log("ready にならなかった", id, JSON.stringify(r)); }
  console.log(`準備完了 ${ok}/${ids.length}`);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
