// 2026-10-09 ばる「iPhoneに通知が来るように」：Threadsの新しいコメントを見つけたら、通知用のIssue（#6）に書き込んで、ばるのiPhoneのGitHubアプリへ通知する。
// 読み取り専用（Threadsの返信を読むだけ。返信・投稿・削除はしない）。GitHub Actions（threads-comment-alert.yml）から呼ぶ。
// すでに通知済みのコメントは、Issueの書き込みに URL が残っているので、それで見分ける（状態をファイルに持たない）。
// 環境変数：THREADS_ACCESS_TOKEN（Threadsの鍵）、GITHUB_TOKEN（Issueへの書き込み）、GITHUB_REPOSITORY、ALERT_ISSUE、TEST_ALERT（"1" のとき接続テストの通知を1件出す）
// 鍵の中身は出力しない。コメント本文は第三者が書いたもの（データ）。@は全角にして、他の人へ通知が飛ばないようにする。
const https = require("https");
const { getMe, listRecentPosts } = require("./threads-client");

const REPO = process.env.GITHUB_REPOSITORY;
const ISSUE = process.env.ALERT_ISSUE;
const OWNER_HANDLE = "bal36036-ai";
const MAX_PER_RUN = 5;

function request(host, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: host, path, method, headers }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        let j = null;
        try { j = JSON.parse(d); } catch (e) { /* 本文なしの応答 */ }
        if (res.statusCode >= 300) reject(new Error(`${host} ${res.statusCode}: ${(j && (j.message || (j.error && j.error.message))) || d.slice(0, 120)}`));
        else resolve(j);
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
const gh = (path, method = "GET", obj) => {
  const body = obj ? JSON.stringify(obj) : null;
  return request("api.github.com", path, method, {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "User-Agent": "sns-engine-alert", Accept: "application/vnd.github+json",
    ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
  }, body);
};
const threads = (path, params) => {
  const q = new URLSearchParams({ ...params, access_token: (process.env.THREADS_ACCESS_TOKEN || "").trim() }).toString();
  return request("graph.threads.net", `/v1.0${path}?${q}`, "GET", {});
};
const jst = (iso) => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 16);
const safe = (t) => (t || "").replace(/@/g, "＠").replace(/\r/g, "").split("\n").map((l) => "> " + l).join("\n");

(async () => {
  if (!REPO || !ISSUE) throw new Error("GITHUB_REPOSITORY / ALERT_ISSUE がありません");
  // 通知済みのコメントのURL（Issueの書き込みから集める）
  const known = new Set();
  for (let page = 1; page <= 20; page++) {
    const cs = await gh(`/repos/${REPO}/issues/${ISSUE}/comments?per_page=100&page=${page}`);
    for (const c of cs) for (const m of (c.body || "").matchAll(/https:\/\/www\.threads\.com\/@[^\s)]+\/post\/[A-Za-z0-9_-]+/g)) known.add(m[0]);
    if (cs.length < 100) break;
  }
  const me = await getMe();
  const posts = await listRecentPosts(me.id, 40);
  const fresh = [];
  for (const p of posts) {
    let r;
    try { r = await threads(`/${p.id}/conversation`, { fields: "id,text,username,timestamp,permalink" }); } catch (e) { continue; }
    for (const x of r.data || []) {
      if (x.username === me.username || !x.permalink || known.has(x.permalink)) continue;
      fresh.push({ ...x, rootLink: p.permalink, rootText: (p.text || "").replace(/\n/g, " ").slice(0, 40) });
    }
  }
  fresh.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  console.log(`確認：投稿${posts.length}件／新しいコメント ${fresh.length} 件（通知済み ${known.size} 件のURLを照合）`);
  if (process.env.TEST_ALERT === "1") {
    await gh(`/repos/${REPO}/issues/${ISSUE}/comments`, "POST", { body: `@${OWNER_HANDLE} 接続テストです。この通知が iPhone の GitHub アプリに届いたら、新しいコメントも同じように届きます。（新しいコメントは ${fresh.length} 件）` });
    console.log("接続テストの通知を書き込みました");
  }
  for (const c of fresh.slice(0, MAX_PER_RUN)) {
    const body = [
      `@${OWNER_HANDLE} **Threads に新しいコメントが来ました**`, "",
      `- 投稿：${c.rootLink}（${c.rootText}…）`,
      `- コメント：＠${c.username}（${jst(c.timestamp)} 日本時間）`, "", safe(c.text), "",
      `- コメントのURL：${c.permalink}`, "",
      "返信の文案は、Claude に「コメント見て」と言えば作ります。返信は、ばるが文章を見て「いいよ」と言ったときだけ投稿します。",
    ].join("\n");
    await gh(`/repos/${REPO}/issues/${ISSUE}/comments`, "POST", { body });
    console.log(`通知を書き込みました：${c.permalink}`);
  }
  if (fresh.length > MAX_PER_RUN) console.log(`ほか ${fresh.length - MAX_PER_RUN} 件は、次の実行で通知します`);
})().catch((e) => { console.error("NG:", e.message); process.exit(1); });
