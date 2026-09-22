// Threads API 接続テストスクリプト(GitHub Actions workflow_dispatchから実行する想定)
// デフォルトは接続確認のみ(getMeでアカウント確認)。
// --publish-test を付けた場合のみ、実際にテキスト投稿を1件作成・公開し、
// インサイト取得・削除まで確認する(この投稿は一時的に公開状態になる)。

const { getMe, createContainer, getContainerStatus, publishContainer, getInsights, getMediaDetail, deletePost } = require("./threads-client");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForContainerReady(containerId, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await getContainerStatus(containerId);
    if (status.status === "FINISHED") return true;
    if (status.status === "ERROR") throw new Error(`コンテナ作成エラー: ${status.error_message || "詳細不明"}`);
    await sleep(2000);
  }
  throw new Error("コンテナのFINISHED待機がタイムアウトしました");
}

async function main() {
  const publishTest = process.argv.includes("--publish-test");
  const result = { steps: [] };

  // --- 接続確認: 自分のアカウント情報を取得 ---
  const me = await getMe();
  result.steps.push({ step: "getMe", ok: true, id: me.id, username: me.username });
  console.log(`接続確認OK: username=${me.username}, id=${me.id}`);

  if (!publishTest) {
    console.log("接続確認のみ完了(--publish-testを付けていないため投稿テストは行いません)");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (me.username !== "genba_apps") {
    throw new Error(`想定外のアカウントです(期待値: genba_apps, 実際: ${me.username})。安全のため投稿テストを中止します。`);
  }

  // --- テキスト投稿の作成・公開テスト ---
  const testText = `【接続テスト投稿】sns-engine Threads公式APIアダプタの動作確認用です。すぐに削除します。(${new Date().toISOString()})`;
  const containerId = await createContainer(me.id, { text: testText, mediaType: "TEXT" });
  result.steps.push({ step: "createContainer", ok: true, containerId });
  console.log(`コンテナ作成OK: ${containerId}`);

  await waitForContainerReady(containerId);
  result.steps.push({ step: "containerReady", ok: true });

  const mediaId = await publishContainer(me.id, containerId);
  result.steps.push({ step: "publishContainer", ok: true, mediaId });
  console.log(`公開OK: mediaId=${mediaId}`);

  const detail = await getMediaDetail(mediaId);
  result.steps.push({ step: "getMediaDetail", ok: true, permalink: detail.permalink });
  console.log(`投稿URL: ${detail.permalink}`);

  // インサイトは公開直後は取得できないことがあるため、エラーは許容する
  try {
    const insights = await getInsights(mediaId);
    result.steps.push({ step: "getInsights", ok: true, insights });
    console.log(`インサイト取得OK: ${JSON.stringify(insights)}`);
  } catch (e) {
    result.steps.push({ step: "getInsights", ok: false, error: e.message });
    console.log(`インサイト取得は公開直後のため未対応の可能性: ${e.message}`);
  }

  // --- 削除テスト(threads_delete権限が必要) ---
  try {
    await deletePost(mediaId);
    result.steps.push({ step: "deletePost", ok: true });
    console.log("削除OK");
  } catch (e) {
    result.steps.push({ step: "deletePost", ok: false, error: e.message });
    console.log(`削除に失敗(手動削除が必要な可能性): ${e.message}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
