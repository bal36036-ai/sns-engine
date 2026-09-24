// Issue #5: 投稿できなかった下書きを、媒体ごとの次の空き枠へ繰り延べる。
// --apply 以外は読み取りのみ。ready/scheduled、投稿済み、過去の実績は変更しない。
const { getPool } = require("./db-client");

const DAY_MS = 86_400_000;
const JST_MS = 9 * 3_600_000;
const MIN_GAP_MS = 3 * 3_600_000;
const MIN_LEAD_MS = 60 * 60_000;
const CONNECTED = ["threads", "instagram", "tiktok", "youtube"];
const TIMES = { threads: ["09:30", "17:00"], instagram: ["12:45"], tiktok: ["18:15"], youtube: ["20:15"] };

function jstDay(date) {
  return new Date(date.getTime() + JST_MS).toISOString().slice(0, 10);
}

function addDays(day, count) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
}

function dailyTarget(sns, day) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  if (sns === "threads") return 2;
  if (sns === "instagram") return [0, 1, 2, 3, 4].includes(dow) ? 1 : 0;
  if (sns === "tiktok") return [0, 2, 4, 6].includes(dow) ? 1 : 0;
  if (sns === "youtube") return [0, 1, 3, 5].includes(dow) ? 1 : 0;
  return 0;
}

function slotTime(day, time) {
  return new Date(`${day}T${time}:00+09:00`).getTime();
}

function isCalendarDraft(row) {
  return row.topic_id?.startsWith("cal-") && row.status === "draft" && !row.is_historical && !row.external_post_id;
}

function planReschedule(rows, now = new Date()) {
  const nowMs = now.getTime();
  const movable = rows.filter((row) => isCalendarDraft(row) && CONNECTED.includes(row.target_sns) && row.scheduled_at);
  const disconnected = rows.filter((row) => isCalendarDraft(row) && ["x", "note"].includes(row.target_sns) && row.scheduled_at);
  const fixed = rows.filter((row) => CONNECTED.includes(row.target_sns) && row.scheduled_at && !movable.includes(row)
    && !["failed", "expired"].includes(row.status) && new Date(row.scheduled_at).getTime() > nowMs);
  const changes = [];
  const today = jstDay(now);
  const horizon = Math.max(90, movable.length + 31);

  for (const sns of CONNECTED) {
    const reserved = new Map();
    const counts = new Map();
    for (const row of fixed.filter((post) => post.target_sns === sns)) {
      const at = new Date(row.scheduled_at).getTime();
      const day = jstDay(new Date(at));
      reserved.set(day, [...(reserved.get(day) || []), at]);
      counts.set(day, (counts.get(day) || 0) + 1);
    }
    const posts = movable.filter((row) => row.target_sns === sns).sort((a, b) =>
      new Date(a.scheduled_at) - new Date(b.scheduled_at) || String(a.id).localeCompare(String(b.id)));
    let previous = -Infinity;
    for (const row of posts) {
      const oldAt = new Date(row.scheduled_at).getTime();
      const earliest = Math.max(nowMs + MIN_LEAD_MS, oldAt > nowMs ? oldAt : 0, previous + 1);
      let chosen = null;
      for (let offset = 0; offset <= horizon && chosen === null; offset++) {
        const day = addDays(today, offset);
        if ((counts.get(day) || 0) >= dailyTarget(sns, day)) continue;
        for (const time of TIMES[sns]) {
          const at = slotTime(day, time);
          if (at < earliest) continue;
          if ((reserved.get(day) || []).some((other) => Math.abs(other - at) < MIN_GAP_MS)) continue;
          chosen = at;
          break;
        }
      }
      if (chosen === null) throw new Error(`${sns} の未来の空き枠が ${horizon} 日以内にありません`);
      const day = jstDay(new Date(chosen));
      reserved.set(day, [...(reserved.get(day) || []), chosen]);
      counts.set(day, (counts.get(day) || 0) + 1);
      previous = chosen;
      if (chosen !== oldAt) changes.push({ id: row.id, topicId: row.topic_id, sns, from: new Date(oldAt).toISOString(), to: new Date(chosen).toISOString(), reason: "過去または埋まった枠から、媒体別の未来の空き枠へ繰り延べ" });
    }
  }
  for (const row of disconnected) {
    changes.push({ id: row.id, topicId: row.topic_id, sns: row.target_sns, from: new Date(row.scheduled_at).toISOString(), to: null, reason: "投稿経路が未接続のため、投稿予定時刻ではなく下書き候補として保持" });
  }
  changes.sort((a, b) => a.from.localeCompare(b.from) || a.sns.localeCompare(b.sns));
  return { changes, overdue: movable.filter((row) => new Date(row.scheduled_at).getTime() <= nowMs).length, disconnected: disconnected.length };
}

async function rescheduleCalendar({ apply = false, now = new Date() } = {}) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    const { rows } = await client.query(
      `SELECT id, topic_id, target_sns, scheduled_at, status, readiness_state,
              is_historical, external_post_id, scheduling_reason
       FROM sns.posts
       WHERE topic_id LIKE 'cal-%'
          OR (scheduled_at >= $1 AND target_sns = ANY($2::text[]))
       FOR UPDATE;`,
      [now.toISOString(), CONNECTED]
    );
    const plan = planReschedule(rows, now);
    if (apply) {
      for (const change of plan.changes) {
        const row = rows.find((item) => item.id === change.id);
        const prior = row.scheduling_reason && typeof row.scheduling_reason === "object" && !Array.isArray(row.scheduling_reason)
          ? row.scheduling_reason : {};
        const history = Array.isArray(prior.rolling_history) ? prior.rolling_history : [];
        const reason = { ...prior, rolling_history: [...history, { from: change.from, to: change.to, at: now.toISOString(), reason: change.reason }] };
        const result = await client.query(
          `UPDATE sns.posts SET scheduled_at = $2, scheduling_reason = $3::jsonb
           WHERE id = $1 AND status = 'draft' AND scheduled_at = $4
             AND is_historical = false AND external_post_id IS NULL;`,
          [change.id, change.to, JSON.stringify(reason), change.from]
        );
        if (result.rowCount !== 1) throw new Error(`更新前に投稿が変わりました: ${change.id}`);
      }
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    const bySns = Object.fromEntries([...new Set(plan.changes.map((item) => item.sns))].map((sns) =>
      [sns, plan.changes.filter((item) => item.sns === sns).length]));
    return { mode: apply ? "apply" : "dry-run", observedAt: now.toISOString(), overdue: plan.overdue,
      rescheduled: plan.changes.filter((item) => item.to).length, disconnected: plan.disconnected, bySns,
      preview: plan.changes.slice(0, 12) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { planReschedule, rescheduleCalendar };

if (require.main === module) {
  rescheduleCalendar({ apply: process.argv.includes("--apply") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
