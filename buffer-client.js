// Buffer GraphQL APIへの直接接続クライアント(MCP非依存)
// 前提: 環境変数 BUFFER_API_KEY が設定されていること(Windowsユーザー環境変数)
// 将来Cloudflare Cronへ移行する場合は、この呼び出し部分(callBufferApi)だけ
// Cloudflare Workerのfetchハンドラ内に移植すればよい設計にしている。

const https = require("https");

const BUFFER_API_URL = "https://api.buffer.com/graphql";
const ORGANIZATION_ID = "6a9ce08c79abd3cf24ec6baf"; // My organization(既存確認済み)

function callBufferApi(query, variables) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) {
    throw new Error("環境変数 BUFFER_API_KEY が見つかりません。Windowsのユーザー環境変数を確認してください。");
  }
  const payload = JSON.stringify({ query, variables });

  return new Promise((resolve, reject) => {
    const req = https.request(
      BUFFER_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload, "utf8"),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.errors) {
              reject(new Error(`Buffer APIエラー: ${JSON.stringify(parsed.errors)}`));
              return;
            }
            resolve(parsed.data);
          } catch (e) {
            reject(new Error(`応答の解析に失敗: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload, "utf8");
    req.end();
  });
}

// 重複チェック：対象チャンネル・同一テキストの予約/送信済み投稿が無いか確認
async function findDuplicatePost(channelId, text) {
  const data = await callBufferApi(
    `query($input: PostsInput!, $first: Int) {
      posts(input: $input, first: $first) {
        edges { node { id status text dueAt channelId } }
      }
    }`,
    { input: { organizationId: ORGANIZATION_ID, filter: { channelIds: [channelId] } }, first: 50 }
  );
  const existing = data.posts.edges.find((e) => e.node.text.trim() === text.trim());
  return existing ? existing.node : null;
}

// 投稿登録。dryRun=trueの場合は下書き保存のみ(実際には配信されない)
async function createPost({ channelId, text, dueAt, assets, metadata, mode, dryRun }) {
  const input = {
    channelId,
    text,
    mode: mode || (dueAt ? "customScheduled" : "addToQueue"),
    schedulingType: "automatic",
    saveToDraft: !!dryRun,
  };
  if (dueAt) input.dueAt = dueAt;
  if (assets) input.assets = assets;
  if (metadata) input.metadata = metadata;

  const data = await callBufferApi(
    `mutation($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id status } }
        ... on InvalidInputError { message }
        ... on UnauthorizedError { message }
        ... on UnexpectedError { message }
        ... on LimitReachedError { message }
      }
    }`,
    { input }
  );
  const result = data.createPost;
  if (result.message) {
    throw new Error(`投稿登録エラー: ${result.message}`);
  }
  return result.post;
}

async function deletePost(id) {
  const data = await callBufferApi(
    `mutation($input: DeletePostInput!) {
      deletePost(input: $input) {
        ... on DeletePostSuccess { id }
        ... on VoidMutationError { message }
      }
    }`,
    { input: { id } }
  );
  return data.deletePost;
}

module.exports = { callBufferApi, findDuplicatePost, createPost, deletePost, ORGANIZATION_ID };
