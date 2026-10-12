// 2026-10-13 ばる「いいよ」：ライト（GENTOS GZ-401）のnote記事の告知を、Threads・Xへ各1回、10/13 19:30 に予約する。
// 告知文はChatGPTの改稿版（Issue #5 2026-10-10）で、ばるが見て承認済み。画像は、公開された記事のヘッダー画像。
// 記事（https://note.com/genba_apps/n/nbaed02927f05）は、未ログインで開けることをClaudeが確認済み（2026-10-12）。
// 使い方：node schedule-tool-announce-20261013.js          … 確認のみ
//         node schedule-tool-announce-20261013.js --apply  … 画像を公開URLへ上げて、2件を登録（準備完了）
const path = require("path");
const { getPool } = require("./db-client");
const { uploadToPublicUrl } = require("./upload-to-public-url");

const URL_NOTE = "https://note.com/genba_apps/n/nbaed02927f05";
const BODY = `【広告】狭いところを、もう少し明るく見たい。そんな時に使っているGENTOS GZ-401。明るさとType-C充電が気に入っています。自分の中では「ライトといえばGENTOS」です。\n${URL_NOTE}`;
const AT = new Date("2026-10-13T19:30:00+09:00");
const SNS = ["threads", "x"];
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|DMください/;

(async () => {
  const apply = process.argv.includes("--apply");
  if (BANNED.test(BODY) || !BODY.startsWith("【広告】")) throw new Error("本文チェックに失敗");
  const xWeight = [...BODY.replace(/https?:\/\/\S+/g, "")].reduce((n, c) => n + (c.charCodeAt(0) < 0x1100 ? 1 : 2), 23);
  if (xWeight > 280) throw new Error(`Xの長さ超過 ${xWeight}`);
  const pool = getPool(); const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (AT.getTime() < Date.now() + 3600e3) throw new Error("予定が近すぎる");
    for (const sns of SNS) {
      const busy = await c.query("SELECT id FROM sns.posts WHERE target_sns=$1 AND scheduled_at=$2 AND status IN ('ready','scheduled','draft')", [sns, AT.toISOString()]);
      if (busy.rowCount) throw new Error(`${sns}: 19:30 の枠が埋まっている`);
      const dup = await c.query("SELECT id FROM sns.posts WHERE target_sns=$1 AND (body_text LIKE '%nbaed02927f05%' OR topic_id=$2)", [sns, "tool-gz401"]);
      if (dup.rowCount) throw new Error(`${sns}: この記事の告知が既にある`);
    }
    let imageUrl = "(未アップロード)";
    if (apply) {
      const r = await uploadToPublicUrl(path.join(__dirname, "assets/issue5/tool-notes/gz401-header.png"), "tool-gz401-header.png");
      imageUrl = typeof r === "string" ? r : r.url;
    }
    for (const sns of SNS) {
      console.log(`${sns} 10/13 19:30｜X加重 ${xWeight}/280｜画像 ${imageUrl}`);
      if (apply) {
        await c.query(
          `INSERT INTO sns.posts (topic_id, target_app, target_sns, title, body_text, media_urls, scheduled_at, is_publishable, feature_published, status, readiness_state, scheduling_reason, duplicate_check)
           VALUES ('tool-gz401','brand',$1,'道具の紹介｜GENTOS GZ-401（noteの告知）',$2,$3,$4,true,true,'ready','ready_candidate',$5,$6)`,
          [sns, BODY, [imageUrl], AT.toISOString(),
            JSON.stringify({ source: "道具note告知（ChatGPT改稿版 2026-10-10）", approved: "bal 2026-10-13 いいよ（noteのURLを貼る形・19:30）", note: "広告表示【広告】あり。1記事につき1回のみ" }),
            JSON.stringify({ checked_at: new Date().toISOString(), result: "none_in_db", note: "DB内の重複なし", approved_by: "bal 2026-10-13" })]);
      }
    }
    await c.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "登録しました（準備完了 2件）" : "dry-run（--apply で実行）");
  } catch (e) { await c.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
