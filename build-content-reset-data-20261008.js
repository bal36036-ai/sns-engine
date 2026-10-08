// 2026-10-08 ばる承認（「いいよ」）：ChatGPTの10/12〜10/25企画（Issue #5 コメント 6043887178）を、DBへ入れる形（content-reset-20261008-posts.json）に整える。
// 元の表は chatgpt-plan-20261008-content-reset.md。本文は直さずそのまま使う。DBは触らない。
// 使い方：node build-content-reset-data-20261008.js <表を解析したJSON> （出力：content-reset-20261008-posts.json）
const fs = require("fs");
const rows = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const APP = { "キリドリ": "kiridori", "ハリナビ": "harinavi", "なし": "brand" };
const TIME = { Threads: "09:30", X: "12:15", TikTok: "18:15", "YouTube Shorts": "20:15" };
const SNS = { Threads: "threads", X: "x", TikTok: "tiktok", "YouTube Shorts": "youtube" };
const out = rows.map((r) => {
  const [mm, dd] = r.date.split("-");
  const sns = SNS[r.sns];
  const isVideo = sns === "tiktok" || sns === "youtube";
  const o = {
    date: `2026-${mm}-${dd}`, sns, app: APP[r.app], kind: r.kind, time: TIME[r.sns],
    topic_id: `cr-2026${mm}${dd}${isVideo ? "-v" : ""}`, media_note: r.media, aim: r.aim,
  };
  const body = r.body.replace(/\r/g, "").trim();
  if (sns === "youtube") {
    const m = body.match(/^タイトル：(.+)\n説明：([\s\S]+)$/);
    if (!m) throw new Error(`YouTube形式が違う: ${r.date}`);
    o.title = m[1].trim(); o.body_text = m[2].trim();
  } else if (sns === "tiktok") {
    const t = r.media.match(/^タイトル：(.+?)。[KH]\d/);
    if (!t) throw new Error(`TikTokのタイトルが取れない: ${r.date}`);
    o.title = t[1].trim(); o.body_text = body;
  } else {
    o.title = `${r.kind}｜${r.app}`; o.body_text = body;
  }
  return o;
});
fs.writeFileSync("content-reset-20261008-posts.json", JSON.stringify(out, null, 1), "utf8");
console.log(`${out.length}件を書き出し`, out.filter((x) => x.sns === "youtube").map((x) => x.title).join(" / "));
