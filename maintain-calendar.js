// 30日先までの不足枠だけを sns.posts に draft として補充する。
// 自動投稿の承認・ready昇格は行わない。--apply のみDBへ書く。
const { getPool } = require("./db-client");
const { ingestPost } = require("./ingest-post");
const { classifyAll } = require("./classify-readiness");
const { TOPICS } = require("./calendar-topics");
const { contentFor, hasHandWritten } = require("./calendar-content");
const { pickFromPool } = require("./post-pool");
const { AUTOMATED_SNS } = require("./buffer-channels");

const TZ_OFFSET = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_DAY = Date.UTC(2026, 8, 24);
const ACTIVE = new Set(["draft", "ready", "scheduled", "sent"]);
const TIMES = { threads: ["09:30"], instagram: ["12:45"], tiktok: ["18:15"], youtube: ["20:15"], x: ["12:15"] };

function jstKey(date) {
  return new Date(date.getTime() + TZ_OFFSET).toISOString().slice(0, 10);
}

function dayKey(startKey, offset) {
  return new Date(Date.parse(`${startKey}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
}

function dateAt(key, time) {
  return new Date(`${key}T${time}:00+09:00`).toISOString();
}

function targets(key) {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay();
  const all = {
    // 2026-10-08 ばる決定「減らして質を上げる」：Threads・Xは1日1本。動画（TikTok・YouTube Shorts、同じ動画を週2〜3本）は、
    // 素材のない定型の下書きを毎晩作らず、ChatGPTの2週間企画（Remotionで制作）から入れる。そのため動画はここでは補充しない。
    threads: 1,
    instagram: [0, 1, 2, 3, 4].includes(dow) ? 1 : 0,
    tiktok: 0,
    youtube: 0,
    x: 1,
  };
  // 自動投稿の対象（buffer-channels.js：Instagramは一時停止中、XはチャンネルID登録後）だけ補充する
  return Object.fromEntries(Object.entries(all).filter(([sns]) => AUTOMATED_SNS.includes(sns)));
}

function planCalendar(existing, now = new Date(), horizonDays = 30) {
  const today = jstKey(now);
  const planned = [];
  const shortages = [];
  const occupied = new Set();
  const bodyKeys = new Set(existing.map((p) => `${p.target_sns}\0${p.body_text}`));
  for (const post of existing) {
    if (post.scheduled_at && ACTIVE.has(post.status)) {
      occupied.add(`${new Date(post.scheduled_at).toISOString()}\0${post.target_sns}`);
    }
  }
  const counts = new Map();
  for (const post of existing) {
    if (!post.scheduled_at || !ACTIVE.has(post.status)) continue;
    const key = `${jstKey(new Date(post.scheduled_at))}\0${post.target_sns}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (let offset = 0; offset <= horizonDays; offset++) {
    const key = dayKey(today, offset);
    const usedTopicsToday = new Set(); // その日にもう使った「本文の材料」の話題（同じ日に重ねない）
    const daysFromFirst = Math.floor((Date.parse(`${key}T00:00:00Z`) - FIRST_DAY) / DAY_MS);
    const topicIndex = ((daysFromFirst % TOPICS.length) + TOPICS.length) % TOPICS.length;
    const variant = ((Math.floor(daysFromFirst / TOPICS.length) % 3) + 3) % 3;
    const topic = TOPICS[topicIndex];
    const target = targets(key);
    for (const [sns, required] of Object.entries(target)) {
      const countKey = `${key}\0${sns}`;
      let missing = Math.max(0, required - (counts.get(countKey) || 0));
      for (let n = 0; n < TIMES[sns].length && missing > 0; n++) {
        const at = dateAt(key, TIMES[sns][n]);
        if (new Date(at) <= now || occupied.has(`${at}\0${sns}`)) continue;
        const second = sns === "threads" && n === 1;
        const topicId = `cal-${key.replaceAll("-", "")}-${second ? "b" : "a"}`;
        const content = contentFor({ date: key, topic, sns, variant, second, index: topicIndex });
        // 手書きの本文がない日のThreads・Xは、定型文より先に、反応の分析に沿った「本文の材料」（post-pool.js）を使う。材料が尽きたら定型文に戻る。
        let bodyText = content.bodyText;
        if ((sns === "threads" || sns === "x") && !hasHandWritten(key, sns, second)) {
          const pooled = pickFromPool({ app: topic[0], sns, taken: bodyKeys, usedTopicsToday, start: daysFromFirst });
          if (pooled) { bodyText = pooled.text; usedTopicsToday.add(pooled.topic); }
        }
        const bodyKey = `${sns}\0${bodyText}`;
        if (bodyKeys.has(bodyKey) || existing.some((p) => p.topic_id === topicId && p.target_sns === sns)) continue;
        planned.push({ topicId, targetApp: topic[0], targetSns: sns, title: `${topic[1]}｜${topic[2]}`, bodyText, contentPlan: content.plan, mediaUrls: [], scheduledAt: at, isPublishable: false, featurePublished: false });
        occupied.add(`${at}\0${sns}`);
        bodyKeys.add(bodyKey);
        missing--;
      }
      if (missing > 0) shortages.push({ date: key, sns, missing });
    }
  }
  return { from: today, through: dayKey(today, horizonDays), planned, shortages };
}

async function maintainCalendar({ apply = false, now = new Date() } = {}) {
  const pool = getPool();
  try {
    const from = dateAt(jstKey(now), "00:00");
    const through = dateAt(dayKey(jstKey(now), 31), "00:00");
    const { rows } = await pool.query(
      `SELECT topic_id, target_sns, body_text, scheduled_at, status FROM sns.posts
       WHERE (scheduled_at >= $1 AND scheduled_at < $2) OR topic_id LIKE 'cal-%';`,
      [from, through]
    );
    const plan = planCalendar(rows, now);
    if (!apply) return { ...plan, mode: "dry-run", planned: plan.planned.length, preview: plan.planned.slice(0, 8) };
    const results = { inserted: 0, duplicates: 0, errors: [], productionPlans: [] };
    for (const post of plan.planned) {
      try {
        const result = await ingestPost(post, { pool });
        if (result.ok) {
          results.inserted++;
          if (post.contentPlan) results.productionPlans.push({ topicId: post.topicId, targetSns: post.targetSns, plan: post.contentPlan });
        }
        else results.duplicates++;
      } catch (e) {
        results.errors.push({ topic_id: post.topicId, sns: post.targetSns, error: e.message });
      }
    }
    const readiness = results.inserted ? await classifyAll() : null;
    return { from: plan.from, through: plan.through, mode: "apply", ...results, shortages: plan.shortages, readiness };
  } finally {
    await pool.end();
  }
}

module.exports = { planCalendar, maintainCalendar, targets };

if (require.main === module) {
  maintainCalendar({ apply: process.argv.includes("--apply") })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      if (r.mode === "apply" && (r.errors.length > 0 || r.shortages.length > 0)) process.exitCode = 1;
    })
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}
