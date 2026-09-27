// 2026-09-28 stage29：素材待ちの残り47件に画像・動画を登録し、waiting_media → needs_review へ進める。
// - 画像・動画は assets/issue5/media2（spec-media.json から生成、実画面は現行版 kiridori_v65 / harinavi_v57）。
// - 公開URLは投稿IDで命名（issue5-<id>-instagram-0N.png / issue5-<id>-narrated.mp4）。日付は入れない。
// - 45d435f2（stage28で日付入り画像を登録済み、needs_review）も、日付なしの作り直し版に差し替える。
// - 夜間の自動補充で追加された b637599c・02162003 は本文が書きかけのテンプレートだったため、本文も差し替える。
// 対象外：本文（上の2件以外）・予定日時・is_publishable / feature_published（false のまま。ready化は別途ばるの承認後）。
// 使い方：node apply-20260928-media-batch3.js        … dry-run
//         node apply-20260928-media-batch3.js --apply … 反映

const fs = require("fs");
const path = require("path");
const { getPool } = require("./db-client");

const BASE = "https://sns-material-storage.gbapp.workers.dev/";
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, "assets/issue5/media2/spec-media.json"), "utf8"));
const NEW_BODIES = {
  b637599c: "紙のメモと計画画面、どう使い分けていますか。\n\n現場のメモは、その場で書けるのが強みです。キリドリでは、メモに書いた部材名・長さ・数量をそのまま入力し、定尺ごとの切り出し案で組み合わせを確かめます。\n\n拾うのは紙、組み合わせは画面。役割を分けると、見返すときも迷いにくくなります。画像の数値は動作確認用の例です。\n#材料取り #キリドリ #げんばアプリ工房",
  "02162003": "紙のメモは、その場で書けるのが強み。書いた長さと本数をキリドリに入力して、組み合わせは定尺ごとの切り出し案で確かめます。画面の数値は動作確認用の例です。\n\nアプリストア公開に向けて開発中です。フォローしてお待ちください。\n#キリドリ #材料取り\n\n音声：VOICEVOX Nemo",
};

const targets = [
  ...Object.entries(spec.instagram).map(([id, cfg]) => ({ id, sns: "instagram", urls: cfg.slides.map((_, i) => `${BASE}issue5-${id}-instagram-${String(i + 1).padStart(2, "0")}.png`) })),
  ...spec.videos.map((v) => ({ id: v.id, sns: v.sns, urls: [`${BASE}issue5-${v.id}-narrated.mp4`] })),
];

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let promoted = 0, replaced = 0, bodies = 0;
    for (const t of targets) {
      const { rows } = await client.query("SELECT id, target_sns, status, readiness_state, media_urls, external_post_id FROM sns.posts WHERE id::text LIKE $1 FOR UPDATE", [`${t.id}%`]);
      if (rows.length !== 1) throw new Error(`${t.id}: 該当 ${rows.length} 件`);
      const post = rows[0];
      if (post.target_sns !== t.sns) throw new Error(`${t.id}: 媒体が違う (${post.target_sns} != ${t.sns})`);
      if (post.status !== "draft" || post.external_post_id) throw new Error(`${t.id}: 未投稿の下書きではない`);
      const isRedo = t.id === "45d435f2";
      if (isRedo ? post.readiness_state !== "needs_review" : post.readiness_state !== "waiting_media") {
        throw new Error(`${t.id}: readiness が想定と違う (${post.readiness_state})`);
      }
      if (!isRedo && post.media_urls && post.media_urls.length) throw new Error(`${t.id}: media_urls が既に設定済み`);
      const body = NEW_BODIES[t.id];
      if (apply) {
        const res = await client.query(
          `UPDATE sns.posts SET media_urls = $2, readiness_state = 'needs_review'${body ? ", body_text = $3" : ""}
            WHERE id = $1 AND status = 'draft' AND external_post_id IS NULL`,
          body ? [post.id, t.urls, body] : [post.id, t.urls]
        );
        if (res.rowCount !== 1) throw new Error(`${t.id}: 更新件数 ${res.rowCount}`);
      }
      if (isRedo) replaced++; else promoted++;
      if (body) bodies++;
    }
    console.log(`waiting_media→needs_review ${promoted}件／作り直し差し替え ${replaced}件／本文差し替え ${bodies}件`);
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "COMMIT" : "dry-run：変更なし（--apply で更新）");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error("ERROR:", error.message); process.exit(1); });
