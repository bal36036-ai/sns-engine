const test = require("node:test");
const assert = require("node:assert/strict");
const { planCalendar, targets } = require("./maintain-calendar");
const { classify } = require("./classify-readiness");

test("30日先までの媒体別在庫を作り、すべて下書きで止める", () => {
  const now = new Date("2026-09-23T22:00:00.000Z");
  const plan = planCalendar([], now);
  assert.equal(plan.from, "2026-09-24");
  assert.equal(plan.through, "2026-10-24");
  assert.equal(plan.shortages.length, 0);
  assert.ok(plan.planned.every((post) => !["x", "note"].includes(post.targetSns)));
  const byDay = new Map();
  for (const p of plan.planned) {
    assert.equal(p.isPublishable, false);
    assert.equal(p.featurePublished, false);
    assert.ok(new Date(p.scheduledAt) > now);
    const key = `${p.scheduledAt.slice(0, 10)}:${p.targetSns}`;
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  for (let day = 0; day <= 30; day++) {
    const key = new Date(Date.parse("2026-09-24T00:00:00Z") + day * 86400000).toISOString().slice(0, 10);
    const expected = targets(key);
    for (const [sns, n] of Object.entries(expected)) {
      const actual = plan.planned.filter((p) => new Date(new Date(p.scheduledAt).getTime() + 9 * 3600000).toISOString().slice(0, 10) === key && p.targetSns === sns).length;
      assert.equal(actual, n, `${key} ${sns}`);
    }
  }
});

test("既存予定と本文・topicの重複を作らない", () => {
  const now = new Date("2026-09-23T22:00:00.000Z");
  const first = planCalendar([], now);
  const existing = first.planned.map((p) => ({ topic_id: p.topicId, target_sns: p.targetSns, body_text: p.bodyText, scheduled_at: p.scheduledAt, status: "draft" }));
  const second = planCalendar(existing, now);
  assert.equal(second.planned.length, 0);
  assert.equal(second.shortages.length, 0);
  assert.equal(new Set(first.planned.map((p) => `${p.targetSns}:${p.bodyText}`)).size, first.planned.length);
});

test("翌日の補充では新しく30日先に入った日だけを追加する", () => {
  const first = planCalendar([], new Date("2026-09-23T22:00:00Z"));
  const existing = first.planned.map((p) => ({ topic_id: p.topicId, target_sns: p.targetSns, body_text: p.bodyText, scheduled_at: p.scheduledAt, status: "draft" }));
  const next = planCalendar(existing, new Date("2026-09-24T15:10:00Z"));
  assert.equal(next.through, "2026-10-25");
  assert.ok(next.planned.length > 0);
  assert.ok(next.planned.every((p) => new Date(new Date(p.scheduledAt).getTime() + 9 * 3600000).toISOString().slice(0, 10) === "2026-10-25"));
  assert.equal(next.shortages.length, 0);
});

test("Threadsは接続済みの文章投稿として判定し、素材待ちは残す", () => {
  const base = { is_historical: false, media_urls: [], is_publishable: true, feature_published: true, duplicate_check: null, scheduled_at: "2026-10-01T00:30:00Z" };
  assert.equal(classify({ ...base, target_sns: "threads" }), "ready_candidate");
  assert.equal(classify({ ...base, target_sns: "tiktok" }), "waiting_media");
  // Instagramは2026-10-01から一時停止（buffer-channels.js）、XはチャンネルID登録まで接続待ち
  assert.equal(classify({ ...base, target_sns: "instagram" }), "waiting_channel");
  assert.equal(classify({ ...base, target_sns: "x" }), "waiting_channel");
});
