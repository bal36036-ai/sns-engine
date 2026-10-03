// 毎日の反応の記録用（読み取りだけ）：Buffer APIから、投稿済みの投稿と反応の数字を取って、JSONファイルに保存する。
// 使い方：node fetch-buffer-posts.js <出力JSONのパス> [件数（既定60）]
// 出力：{ edges: [{ node: { id, status, text, sentAt, channelService, assets, metrics, metricsUpdatedAt } }] }（collect-reactions.py の --buffer に渡す）
// 前提：環境変数 BUFFER_API_KEY（Windowsのユーザー環境変数）。
const fs = require("fs");
const https = require("https");
const ORG = "6a9ce08c79abd3cf24ec6baf";

function call(query, variables) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("環境変数 BUFFER_API_KEY が見つかりません");
  const payload = JSON.stringify({ query, variables });
  return new Promise((resolve, reject) => {
    const req = https.request("https://api.buffer.com/graphql", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload, "utf8") } }, (res) => {
      let d = ""; res.on("data", (c) => (d += c));
      res.on("end", () => { try { const j = JSON.parse(d); j.errors ? reject(new Error(JSON.stringify(j.errors))) : resolve(j.data); } catch (e) { reject(new Error(`応答の解析に失敗: ${d.slice(0, 200)}`)); } });
    });
    req.on("error", reject); req.write(payload, "utf8"); req.end();
  });
}

(async () => {
  const out = process.argv[2];
  if (!out) throw new Error("出力パスを指定してください");
  const first = Number(process.argv[3] || 60);
  const data = await call(
    `query($input: PostsInput!, $first: Int) {
      posts(input: $input, first: $first) {
        edges { node { id status text sentAt channelService assets { type } metrics { type value } metricsUpdatedAt } }
      }
    }`,
    { input: { organizationId: ORG, filter: { status: ["sent"] }, sort: [{ field: "dueAt", direction: "desc" }] }, first }
  );
  fs.writeFileSync(out, JSON.stringify(data.posts, null, 1), "utf8");
  console.log(`保存：${out}（${data.posts.edges.length}件）`);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
