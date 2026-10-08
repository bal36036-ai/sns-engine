// 2026-10-08 ばる「なるべく早く出していいよ！」：現場の会話劇5本（キャラクター動画）を、空いている TikTok・YouTube の枠に早い順で入れる。
// 動画：assets/issue5/remotion/skits/skit-1〜5.mp4（1080×1080、声はWhisperで確認済み）。キャラの絵はAIで作成、音声はVOICEVOX Nemo。
// 使い方：node schedule-skits-20261008.js          … 確認のみ
//         node schedule-skits-20261008.js --apply  … アップロード→下書き登録→準備完了（Buffer側の重複確認つき）
const path = require("path");
const { getPool } = require("./db-client");
const { uploadToPublicUrl } = require("./upload-to-public-url");
const { promoteToReady } = require("./promote-to-ready");

const TAIL = "\n#現場あるある #鉄骨 #建設業\nキャラクターの絵：AIで作成／音声：VOICEVOX Nemo";
const SKITS = [
  { no: 1, tt: "2026-10-09T18:15:00+09:00", yt: "2026-10-10T20:15:00+09:00", title: "端材の長さ、分からない｜現場あるある会話劇",
    body: "「あとで使えそう」で残した端材。いざ使うとき、長さが分からないことってありませんか？\nみなさんは、端材の長さ、どこに残していますか？" },
  { no: 2, tt: "2026-10-12T18:15:00+09:00", yt: "2026-10-12T20:15:00+09:00", title: "図面の赤字、どれが最新？｜現場あるある会話劇",
    body: "図面の赤字、メモの追記、口頭の変更。「どれが最新？」となること、ありませんか？\nいま使う数字、みなさんはどう確かめていますか？" },
  { no: 3, tt: "2026-10-14T18:15:00+09:00", yt: "2026-10-14T20:15:00+09:00", title: "寸法と数量がバラバラ｜現場あるある会話劇",
    body: "寸法は図面、数量は別のメモ。切る前にそろえるだけで、ひと仕事ですよね。\n切る前の準備、地味に時間かかりませんか？" },
  { no: 4, tt: "2026-10-15T18:15:00+09:00", yt: "2026-10-15T20:15:00+09:00", title: "自分のメモの印、なんだっけ｜現場あるある会話劇",
    body: "書いた本人には分かるメモの印。渡した先では「これは何？」となることも。\n自分のメモ、伝わらなかったことありませんか？" },
  { no: 5, tt: "2026-10-17T18:15:00+09:00", yt: "2026-10-17T20:15:00+09:00", title: "切りしろ、入れた？｜現場あるある会話劇",
    body: "新人さんに「切りしろ、ちゃんと見てる？」。\nみなさんは、切りしろ（刃幅）、いくつで見ていますか？" },
];
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|試せます|使ってみて|DMください/;

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const ids = [];
  try {
    for (const s of SKITS) {
      const body = s.body + TAIL;
      if (BANNED.test(body)) throw new Error(`${s.no}: 禁止表現`);
      if ([...s.title].length > 95) throw new Error(`${s.no}: タイトルが長い`);
      for (const [sns, at] of [["tiktok", s.tt], ["youtube", s.yt]]) {
        const busy = await pool.query("SELECT id FROM sns.posts WHERE target_sns=$1 AND scheduled_at=$2 AND status IN ('ready','scheduled','draft')", [sns, at]);
        if (busy.rowCount) throw new Error(`${s.no} ${sns}: ${at} の枠が埋まっている`);
        if (new Date(at).getTime() < Date.now() + 60 * 60e3) throw new Error(`${s.no} ${sns}: 予定が近すぎる`);
      }
      console.log(`${s.no} ${s.title}：TikTok ${s.tt.slice(5, 16)}／YouTube ${s.yt.slice(5, 16)}`);
    }
    if (!apply) { console.log("dry-run（--apply で実行）"); return; }
    for (const s of SKITS) {
      const file = path.join(__dirname, "assets/issue5/remotion/skits", `skit-${s.no}.mp4`);
      const r = await uploadToPublicUrl(file, `sk-20261008-skit-${s.no}.mp4`);
      const url = typeof r === "string" ? r : r.url;
      for (const [sns, at] of [["tiktok", s.tt], ["youtube", s.yt]]) {
        const ins = await pool.query(
          `INSERT INTO sns.posts (topic_id, target_app, target_sns, title, body_text, media_urls, scheduled_at, is_publishable, feature_published, status, readiness_state, scheduling_reason)
           VALUES ($1,'brand',$2,$3,$4,$5,$6,true,true,'draft','ready_candidate',$7) RETURNING id`,
          [`sk-20261008-${s.no}`, sns, s.title, s.body + TAIL, [url], at, JSON.stringify({ source: "現場の会話劇5本（2026-10-08）", approved: "bal 2026-10-08 なるべく早く出していいよ" })]);
        ids.push(ins.rows[0].id);
      }
      console.log(`${s.no}: アップロード・登録 ${url}`);
    }
  } finally { await pool.end(); }
  let ok = 0;
  for (const id of ids) { const r = await promoteToReady(id); if (r.ok) ok++; else console.log("ready にならなかった", id, JSON.stringify(r)); }
  console.log(`準備完了 ${ok}/${ids.length}`);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
