// 2026-10-09 ばる「返信していいですよ」：クイズの投稿へ来た2件のコメントに、文案どおり返信する（反応記録/コメント記録.md の文案）。
// 手動ワークフロー threads-reply-post.yml から呼ぶ。APPLY=1 のときだけ投稿する（それ以外は、投稿先の確認だけ）。
// 同じ本文の返信が既にあれば、二重に投稿しない。トークンの中身は出力しない。
const https = require("https");
const { getMe, listRecentPosts, getMediaDetail } = require("./threads-client");

const APPLY = process.env.APPLY === "1";
// 1回目（10/9 朝）の2件は投稿済み。2回目（10/9 note公開後、ばる「いいよ」）：10/6のコメントの下に、noteの記事を案内する返信を1本だけ。
const REPLIES = [
  { commentShort: "DeJ2Ab8EgMT", text: "お待たせしました。切りしろの説明を、図つきの記事にしました。6mから1.5mを何本取れるかの答え合わせです。\nhttps://note.com/genba_apps/n/n45d668093a93\nまだ分かりにくいところがあれば、教えてください。" },
];
const COMMENTER = "hongfushixiaochu";

function call(method, path, params) {
  const token = (process.env.THREADS_ACCESS_TOKEN || "").trim();
  if (!token) throw new Error("THREADS_ACCESS_TOKEN がありません");
  const q = new URLSearchParams({ ...params, access_token: token }).toString();
  return new Promise((resolve, reject) => {
    const opt = { hostname: "graph.threads.net", path: `/v1.0${path}${method === "GET" ? "?" + q : ""}`, method, headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(q, "utf8") } : {} };
    const req = https.request(opt, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { const j = JSON.parse(d); j.error ? reject(new Error(`${j.error.message} (code ${j.error.code})`)) : resolve(j); } catch (e) { reject(new Error("応答の解析に失敗")); }
      });
    });
    req.on("error", reject);
    if (method === "POST") req.write(q, "utf8");
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const me = await getMe();
  const posts = await listRecentPosts(me.id, 40);
  const conv = [];
  for (const p of posts) {
    try {
      const r = await call("GET", `/${p.id}/conversation`, { fields: "id,text,username,timestamp,permalink" });
      for (const x of r.data || []) conv.push({ ...x, root: p.permalink });
    } catch (e) { /* 返信がない投稿は飛ばす */ }
  }
  console.log(`モード：${APPLY ? "投稿する" : "確認だけ（投稿しない）"}／返信を ${conv.length} 件取得`);
  for (const r of REPLIES) {
    const target = conv.find((x) => x.username === COMMENTER && (x.permalink || "").endsWith(`/${r.commentShort}`));
    if (!target) { console.log(`✗ ${r.commentShort}：対象のコメントが見つかりません。中止`); process.exitCode = 1; continue; }
    const already = conv.find((x) => x.username === me.username && (x.text || "").trim() === r.text.trim());
    console.log(`\n対象：@${target.username} 「${(target.text || "").replace(/\n/g, " ").slice(0, 40)}…」 ${target.permalink}\n  元の投稿：${target.root}\n  返信の本文（${[...r.text].length}字）：${r.text}`);
    if (already) { console.log("  → 同じ本文の返信が既にあります。スキップ"); continue; }
    if ([...r.text].length > 500) throw new Error("500字を超えています");
    if (!APPLY) { console.log("  → 確認のみ（投稿しません）"); continue; }
    const c = await call("POST", `/${me.id}/threads`, { media_type: "TEXT", text: r.text, reply_to_id: target.id });
    await sleep(6000);
    const pub = await call("POST", `/${me.id}/threads_publish`, { creation_id: c.id });
    const d = await getMediaDetail(pub.id);
    console.log(`  → 投稿しました：${d.permalink}`);
    await sleep(3000);
  }
})().catch((e) => { console.error("NG:", e.message); process.exit(1); });
