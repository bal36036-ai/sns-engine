// SNS素材をCloudflare Workers(sns-material-storage)へアップロードし、公開URLを返す
// 使い方: node upload-to-public-url.js <ローカルファイルパス> [公開先のキー名(省略時はファイル名)]
//
// 前提: 環境変数 SNS_WORKER_UPLOAD_SECRET が設定されていること(Windowsユーザー環境変数)
// 将来R2へ切り替える場合は、この関数の中身だけ差し替えればよい設計にしている。

const fs = require("fs");
const path = require("path");
const https = require("https");

const WORKER_BASE_URL = "https://sns-material-storage.gbapp.workers.dev";

const CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

async function uploadToPublicUrl(localFilePath, keyName) {
  const uploadSecret = process.env.SNS_WORKER_UPLOAD_SECRET;
  if (!uploadSecret) {
    throw new Error("環境変数 SNS_WORKER_UPLOAD_SECRET が見つかりません。Windowsのユーザー環境変数を確認してください。");
  }
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`ファイルが見つかりません: ${localFilePath}`);
  }

  const key = keyName || path.basename(localFilePath);
  const contentType = guessContentType(localFilePath);
  const body = fs.readFileSync(localFilePath);

  const url = new URL(`${WORKER_BASE_URL}/upload/${encodeURIComponent(key)}`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: "PUT",
        headers: {
          Authorization: `Bearer ${uploadSecret}`,
          "Content-Type": contentType,
          "Content-Length": body.length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`アップロード失敗 (status ${res.statusCode}): ${data}`));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.url);
          } catch (e) {
            reject(new Error(`応答の解析に失敗: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

if (require.main === module) {
  const [, , filePath, keyName] = process.argv;
  if (!filePath) {
    console.error("使い方: node upload-to-public-url.js <ファイルパス> [キー名]");
    process.exit(1);
  }
  uploadToPublicUrl(filePath, keyName)
    .then((url) => {
      console.log(url);
    })
    .catch((err) => {
      console.error(`エラー: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { uploadToPublicUrl };
