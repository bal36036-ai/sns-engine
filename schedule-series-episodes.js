// 連載『クロの鉄骨工房』の動画を、検査（柵）に合格したものだけ、TikTok 12:30／YouTube 12:45 に予約する。
// ばる 2026-10-15「確認せず自動でどんどん更新して投稿していきたい」「任せます」。設計：SNS集客/自動運用_設計_20261015.md
// データ：series-episodes.json（話ごとの動画・日付・本文）。検査に落ちた話は、登録せずに理由を表示して止める。
// 使い方：node schedule-series-episodes.js [話の番号…]          … 検査だけ（登録しない）
//         node schedule-series-episodes.js --apply [話の番号…]  … アップロード→登録→準備完了
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { getPool } = require("./db-client");
const { uploadToPublicUrl } = require("./upload-to-public-url");
const { promoteToReady } = require("./promote-to-ready");

const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|試せます|使ってみて|DMください|最大荷重|時短|削減できます/;
const SLOTS = { tiktok: "12:30", youtube: "12:45" };

function lint(ep, file) {
  const errs = [];
  for (const [label, t] of [["TikTok本文", ep.tiktok], ["YouTube本文", ep.youtube], ["TikTokタイトル", ep.title_tiktok], ["YouTubeタイトル", ep.title_youtube]]) {
    if (BANNED.test(t)) errs.push(`${label}：禁止語`);
  }
  for (const [label, t] of [["TikTok本文", ep.tiktok], ["YouTube本文", ep.youtube]]) {
    if (!t.includes("VOICEVOX Nemo")) errs.push(`${label}：音声クレジットなし`);
    if (!t.includes("架空のキャラクター")) errs.push(`${label}：「架空のキャラクター」の表記なし`);
    if (!t.includes("AIで作成")) errs.push(`${label}：絵のクレジットなし`);
    if (/ハリナビ/.test(t) && !t.includes("一次照査の補助")) errs.push(`${label}：ハリナビの注意文なし`);
  }
  if ([...ep.title_youtube].length > 95) errs.push("YouTubeタイトルが95字を超える");
  if (!fs.existsSync(file)) { errs.push("動画ファイルがない"); return errs; }
  const mb = fs.statSync(file).size / 1e6;
  if (mb > 17) errs.push(`動画が大きい（${mb.toFixed(1)}MB。上限17MB）`);
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]).toString();
    const sec = Number(out.split(/[\s,]+/).filter(Boolean).pop());
    if (!(sec >= 45 && sec <= 70)) errs.push(`長さが範囲外（${sec}秒。45〜70秒）`);
  } catch (e) { errs.push("ffprobe で長さを確認できない"); }
  return errs;
}

(async () => {
  const apply = process.argv.includes("--apply");
  const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
  const eps = JSON.parse(fs.readFileSync(path.join(__dirname, "series-episodes.json"), "utf8")).filter((e) => !only.length || only.includes(e.no));
  const pool = getPool();
  const ids = [];
  try {
    const ok = [];
    for (const ep of eps) {
      const file = path.join(__dirname, ep.video);
      const errs = lint(ep, file);
      for (const sns of ["tiktok", "youtube"]) {
        const at = `${ep.date}T${SLOTS[sns]}:00+09:00`;
        if (new Date(at).getTime() < Date.now() + 60 * 60e3) errs.push(`${sns}：予定が近すぎる`);
        const busy = await pool.query("SELECT id FROM sns.posts WHERE target_sns=$1 AND scheduled_at=$2 AND status IN ('ready','scheduled','draft','sent')", [sns, at]);
        if (busy.rowCount) errs.push(`${sns}：${ep.date} ${SLOTS[sns]} の枠が埋まっている`);
        const dup = await pool.query("SELECT id FROM sns.posts WHERE target_sns=$1 AND topic_id=$2", [sns, ep.key]);
        if (dup.rowCount) errs.push(`${sns}：${ep.key} は登録済み`);
      }
      if (errs.length) console.log(`✗ 第${ep.no}話：検査に不合格 → 登録しません\n   ・${errs.join("\n   ・")}`);
      else { console.log(`✓ 第${ep.no}話：検査に合格（${ep.date} TikTok ${SLOTS.tiktok}／YouTube ${SLOTS.youtube}）`); ok.push(ep); }
    }
    if (!apply) { console.log("検査のみ（--apply で登録）"); return; }
    for (const ep of ok) {
      const r = await uploadToPublicUrl(path.join(__dirname, ep.video), `${ep.key}.mp4`);
      const url = typeof r === "string" ? r : r.url;
      for (const sns of ["tiktok", "youtube"]) {
        const at = `${ep.date}T${SLOTS[sns]}:00+09:00`;
        const ins = await pool.query(
          `INSERT INTO sns.posts (topic_id, target_app, target_sns, title, body_text, media_urls, scheduled_at, is_publishable, feature_published, status, readiness_state, scheduling_reason)
           VALUES ($1,'kiridori',$2,$3,$4,$5,$6,true,true,'draft','ready_candidate',$7) RETURNING id`,
          [ep.key, sns, sns === "tiktok" ? ep.title_tiktok : ep.title_youtube, sns === "tiktok" ? ep.tiktok : ep.youtube, [url], at,
            JSON.stringify({ source: ep.plan, approved: "bal 2026-10-15 動画の案から投稿まで自動運用を任せた（自動検査に合格）", lint: "合格" })]);
        ids.push(ins.rows[0].id);
      }
      console.log(`第${ep.no}話：アップロード・登録 ${url}`);
    }
  } finally { await pool.end(); }
  let n = 0;
  for (const id of ids) { const r = await promoteToReady(id); if (r.ok) n++; else console.log("ready にならなかった", id, JSON.stringify(r)); }
  if (apply) console.log(`準備完了 ${n}/${ids.length}`);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
