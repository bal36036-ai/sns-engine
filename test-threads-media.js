// Threads API 画像/動画投稿テスト(GitHub Actions workflow_dispatchから実行する想定)
// 1回の実行で1件だけ投稿する。削除は行わない(手動削除前提)。
// 使い方: node test-threads-media.js --type=image --url=https://.../day7-1.png
//        node test-threads-media.js --type=video --url=https://.../day9-1.mp4

const { getMe, createContainer, waitForContainerReady, publishContainer, getInsights, getMediaDetail } = require("./threads-client");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

async function main() {
  const type = getArg("type"); // "image" | "video"
  const url = getArg("url");
  if (!type || !["image", "video"].includes(type)) {
    throw new Error("--type=image または --type=video を指定してください");
  }
  if (!url) {
    throw new Error("--url=<公開メディアURL> を指定してください");
  }

  const result = { type, url, steps: [] };

  const me = await getMe();
  result.steps.push({ step: "getMe", ok: true, username: me.username });
  console.log(`接続確認OK: username=${me.username}`);

  if (me.username !== "genba_apps") {
    throw new Error(`想定外のアカウントです(期待値: genba_apps, 実際: ${me.username})。安全のため中止します。`);
  }

  const testText = `【接続テスト投稿・${type === "image" ? "画像" : "動画"}】\nsns-engine Threads公式APIアダプタの${type === "image" ? "画像" : "動画"}投稿確認用です。`;
  const containerParams = { text: testText, mediaType: type === "image" ? "IMAGE" : "VIDEO" };
  if (type === "image") containerParams.imageUrl = url;
  if (type === "video") containerParams.videoUrl = url;

  const containerId = await createContainer(me.id, containerParams);
  result.steps.push({ step: "createContainer", ok: true, containerId });
  console.log(`コンテナ作成OK: ${containerId}`);

  await waitForContainerReady(containerId, 120000);
  result.steps.push({ step: "containerReady", ok: true });
  console.log("コンテナ処理完了(FINISHED)");

  const mediaId = await publishContainer(me.id, containerId);
  result.steps.push({ step: "publishContainer", ok: true, mediaId });
  console.log(`公開OK: mediaId=${mediaId}`);

  await sleep(2000);

  const detail = await getMediaDetail(mediaId);
  result.steps.push({ step: "getMediaDetail", ok: true, permalink: detail.permalink, mediaType: detail.media_type });
  console.log(`投稿URL: ${detail.permalink}`);

  try {
    const insights = await getInsights(mediaId);
    result.steps.push({ step: "getInsights", ok: true, insights });
    console.log(`インサイト取得OK: ${JSON.stringify(insights)}`);
  } catch (e) {
    result.steps.push({ step: "getInsights", ok: false, error: e.message });
    console.log(`インサイト取得エラー(公開直後は未対応の可能性): ${e.message}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
