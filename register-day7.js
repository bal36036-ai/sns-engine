const { findDuplicatePost, createPost } = require("./buffer-client");

const INSTAGRAM_CHANNEL_ID = "6a9ce332cd8b9c702c154469";

const DAY7_TEXT = `「キリドリ」の結果画面の見方です。

・定尺が何本いるか（1本目・2本目…）
・1本ごとにどこで切るか（図）
・それぞれ残る端材の長さ
・全体の合計端材と、刃幅で消える分（刃幅ロス）

加工指示を作るときにそのまま使える形にしたくて、この並びにしています。
「この項目もほしい」があれば教えてください。開発の参考にします。

#材料取り #製缶 #鉄工 #現場改善 #個人開発`;

const IMAGE_URLS = [
  "https://sns-material-storage.gbapp.workers.dev/day7-1.png",
  "https://sns-material-storage.gbapp.workers.dev/day7-2.png",
];

async function main() {
  const dup = await findDuplicatePost(INSTAGRAM_CHANNEL_ID, DAY7_TEXT);
  if (dup) {
    console.log(JSON.stringify({ ok: false, reason: "duplicate", existing: dup }, null, 2));
    return;
  }

  const dryRun = process.argv.includes("--dry-run");

  const post = await createPost({
    channelId: INSTAGRAM_CHANNEL_ID,
    text: DAY7_TEXT,
    assets: IMAGE_URLS.map((url) => ({ image: { url } })),
    metadata: { instagram: { type: "post", shouldShareToFeed: true } },
    mode: "shareNow",
    dryRun,
  });

  console.log(JSON.stringify({ ok: true, post, imageUrls: IMAGE_URLS, dryRun }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
