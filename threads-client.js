// Meta公式 Threads API への直接接続クライアント(MCP非依存)
// 前提: 環境変数 THREADS_ACCESS_TOKEN が設定されていること(GitHub Actions Secrets)
// Threadsテスター登録により、genba_apps自身への投稿はApp Review不要で行える。
// 投稿は「コンテナ作成 → publish」の2段階方式(Buffer等の下書き保存とは異なり、
// publish時点で即座に公開される。Threads APIに非公開の下書き機能は無い)。

const https = require("https");

const GRAPH_API_BASE = "graph.threads.net";
const GRAPH_API_VERSION = "v1.0";

function callThreadsApi(method, path, params = {}) {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("環境変数 THREADS_ACCESS_TOKEN が見つかりません。GitHub Actions Secretsを確認してください。");
  }

  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({ ...params, access_token: accessToken }).toString();
    const options = {
      hostname: GRAPH_API_BASE,
      path: `/${GRAPH_API_VERSION}${path}${method === "GET" || method === "DELETE" ? `?${query}` : ""}`,
      method,
      headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(query, "utf8") } : {},
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Threads APIエラー: ${parsed.error.message} (code: ${parsed.error.code}, type: ${parsed.error.type})`));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`応答の解析に失敗: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (method === "POST") req.write(query, "utf8");
    req.end();
  });
}

// 自分のThreadsユーザーID・ユーザーネームを取得(接続確認・投稿先IDの特定に使用)
async function getMe() {
  return callThreadsApi("GET", "/me", { fields: "id,username" });
}

// メディアコンテナを作成(テキスト投稿 / 画像投稿 / 動画投稿に対応)
// mediaType: "TEXT" | "IMAGE" | "VIDEO"
async function createContainer(threadsUserId, { text, mediaType = "TEXT", imageUrl, videoUrl }) {
  const params = { media_type: mediaType };
  if (text) params.text = text;
  if (mediaType === "IMAGE" && imageUrl) params.image_url = imageUrl;
  if (mediaType === "VIDEO" && videoUrl) params.video_url = videoUrl;

  const result = await callThreadsApi("POST", `/${threadsUserId}/threads`, params);
  return result.id; // creation_id(コンテナID)
}

// コンテナのステータス確認(動画は処理に時間がかかるため、FINISHEDになるまで待つ必要がある)
async function getContainerStatus(containerId) {
  return callThreadsApi("GET", `/${containerId}`, { fields: "status,error_message" });
}

// コンテナを公開(この時点で実際にThreadsへ公開される。取り消し不可)
async function publishContainer(threadsUserId, creationId) {
  const result = await callThreadsApi("POST", `/${threadsUserId}/threads_publish`, { creation_id: creationId });
  return result.id; // 公開された投稿のID
}

// 投稿のインサイト(閲覧数・いいね数等)を取得
async function getInsights(mediaId, metrics = ["views", "likes", "replies", "reposts", "quotes", "shares"]) {
  return callThreadsApi("GET", `/${mediaId}/insights`, { metric: metrics.join(",") });
}

// 投稿の詳細(パーマリンク等)を取得
async function getMediaDetail(mediaId) {
  return callThreadsApi("GET", `/${mediaId}`, { fields: "id,permalink,text,timestamp,media_type" });
}

// 投稿を削除(threads_delete権限が必要。付与していない場合はAPIエラーになる)
async function deletePost(mediaId) {
  return callThreadsApi("DELETE", `/${mediaId}`, {});
}

module.exports = {
  getMe,
  createContainer,
  getContainerStatus,
  publishContainer,
  getInsights,
  getMediaDetail,
  deletePost,
};
