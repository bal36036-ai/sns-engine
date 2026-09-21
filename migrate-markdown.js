// 既存の投稿本文Markdown(投稿本文_媒体別_v1_20260911.md)から投稿候補を読み取り、
// sns.posts へ draft として初期移行する。
//
// 注意：ここで移行される内容の多くは「既に過去に実際投稿済み」の履歴データ。
// 移行後も自動でreadyへは進めない(promote-to-ready.jsは別途手動/レビューで実行する)。
// Buffer側の重複チェックがあるため、万一readyへ進めても実際に二重投稿はされない設計だが、
// 過去分をわざわざ再送する意味は無いため、レビューなしでの昇格は想定しない。

const fs = require("fs");
const { ingestPost } = require("./ingest-post");

const MD_PATH = "C:/新しいフォルダー/OneDrive/AI作成/SNS集客/投稿本文_媒体別_v1_20260911.md";

const PLATFORM_MAP = {
  "Instagram（キャプション）": ["instagram"],
  "Instagram": ["instagram"],
  "TikTok / YouTube Shorts（説明文）": ["tiktok", "youtube"],
  "X（1ポスト）": ["x"],
  "X": ["x"],
  "Threads": ["threads"],
};

function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const candidates = [];
  let currentTopic = null; // { topicId, title }
  let currentPlatformSnsList = null;
  let buffer = [];

  function flush() {
    if (currentTopic && currentPlatformSnsList && buffer.length > 0) {
      const body = buffer.join("\n").trim();
      if (body) {
        for (const sns of currentPlatformSnsList) {
          candidates.push({ topicId: currentTopic, targetSns: sns, bodyText: body });
        }
      }
    }
    buffer = [];
  }

  for (const line of lines) {
    const h2 = line.match(/^##\s+(主要\d+|短文[A-D])｜?(.*)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const hr = line.match(/^---\s*$/);

    if (h2) {
      flush();
      currentTopic = h2[1];
      currentPlatformSnsList = null;
      continue;
    }
    if (h3) {
      flush();
      const label = h3[1].trim();
      currentPlatformSnsList = PLATFORM_MAP[label] || null;
      continue;
    }
    if (hr) {
      flush();
      currentTopic = null;
      currentPlatformSnsList = null;
      continue;
    }
    if (currentTopic && currentPlatformSnsList) {
      buffer.push(line);
    }
  }
  flush();
  return candidates;
}

async function main() {
  const text = fs.readFileSync(MD_PATH, "utf8");
  const candidates = parseMarkdown(text);

  const results = { imported: [], skipped: [], errors: [] };
  for (const c of candidates) {
    try {
      const r = await ingestPost({
        topicId: `legacy-${c.topicId}`,
        targetApp: "kiridori",
        targetSns: c.targetSns,
        bodyText: c.bodyText,
        mediaUrls: [],
        scheduledAt: null,
        isPublishable: true,
        featurePublished: true,
      });
      if (r.ok) {
        results.imported.push({ topicId: `legacy-${c.topicId}`, targetSns: c.targetSns, id: r.post.id });
      } else {
        results.skipped.push({ topicId: `legacy-${c.topicId}`, targetSns: c.targetSns, reason: r.reason });
      }
    } catch (e) {
      results.errors.push({ topicId: c.topicId, targetSns: c.targetSns, error: e.message });
    }
  }
  console.log(JSON.stringify({ totalParsed: candidates.length, ...results }, null, 2));
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
