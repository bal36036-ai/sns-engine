// 2026-10-08：10/12〜10/25の画像14枚・動画5本を、公開URL（Cloudflare Worker sns-material-storage）へ上げて、URL一覧を content-reset-20261008-media.json に残す。
const fs = require("fs");
const path = require("path");
const { uploadToPublicUrl } = require("./upload-to-public-url");
const base = path.join(__dirname, "assets/issue5/content-reset-20261008");
(async () => {
  const out = {};
  for (const sub of ["images", "videos"]) {
    for (const f of fs.readdirSync(path.join(base, sub)).sort()) {
      const key = `cr-${f}`;
      const r = await uploadToPublicUrl(path.join(base, sub, f), key);
      const url = typeof r === "string" ? r : r.url;
      out[f] = url;
      console.log(f, "→", url);
    }
  }
  fs.writeFileSync(path.join(__dirname, "content-reset-20261008-media.json"), JSON.stringify(out, null, 1), "utf8");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
