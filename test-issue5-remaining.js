const test = require("node:test");
const assert = require("node:assert/strict");
const baseline = require("./issue5-remaining-baseline.json");
const { REMAINING } = require("./remaining-content");
const { expectedEntries, prepareRemaining } = require("./apply-issue5-remaining");
const { planCalendar } = require("./maintain-calendar");
const { keyFor } = require("./apply-first-week-content");

function baselineRowsWithNewBodies() {
  return baseline.items.map((item) => {
    const [date, sns] = item.key.split(":");
    return {
      id: item.id,
      topic_id: item.topicId,
      target_sns: item.targetSns,
      scheduled_at: item.scheduledAt,
      body_text: REMAINING[date][sns].bodyText,
      status: item.status,
      readiness_state: item.readinessState,
      media_urls: [],
      is_publishable: item.isPublishable,
      feature_published: item.featurePublished,
      is_historical: item.isHistorical,
    };
  });
}

test("既存111件の媒体別本文と制作案を投稿キーごとに用意する", () => {
  const entries = expectedEntries();
  assert.equal(entries.length, 111);
  assert.deepEqual(entries.reduce((acc, { key }) => {
    const sns = key.endsWith(":threads_b") ? "threads" : key.split(":")[1];
    acc[sns] = (acc[sns] || 0) + 1;
    return acc;
  }, {}), { threads: 48, instagram: 16, tiktok: 14, youtube: 13, x: 17, note: 3 });
  assert.deepEqual(new Set(entries.map(({ key }) => key)), new Set(baseline.items.map((item) => item.key)));
  const bodyKeys = new Set();
  let planCount = 0;
  for (const { key, content } of entries) {
    const sns = key.split(":")[1];
    assert.ok(content.bodyText?.trim(), key);
    assert.doesNotMatch(content.bodyText, /開発中です/, key);
    const bodyKey = `${sns === "threads_b" ? "threads" : sns}\0${content.bodyText}`;
    assert.ok(!bodyKeys.has(bodyKey), `${key}: 同一媒体の本文重複`);
    bodyKeys.add(bodyKey);
    if (["instagram", "tiktok", "youtube", "note"].includes(sns)) {
      assert.ok(content.plan, `${key}: 制作案`);
      planCount++;
    }
    if (sns === "instagram") assert.ok(content.plan.slides?.length >= 5, `${key}: 画像構成`);
    if (["tiktok", "youtube"].includes(sns)) assert.ok(content.plan.video?.length >= 4, `${key}: 秒割台本`);
    if (sns === "note") assert.ok(content.plan.sections?.length >= 5, `${key}: 記事構成`);
  }
  assert.equal(planCount, 46);
});

test("基準から投稿状態または本文が変われば111件の更新を中止する", () => {
  const rows = baselineRowsWithNewBodies();
  assert.equal(prepareRemaining(rows).length, 0);
  rows[0].status = "ready";
  assert.throws(() => prepareRemaining(rows), /状態・日時・公開可否/);
  rows[0].status = "draft";
  rows[0].body_text = "想定外の本文";
  assert.throws(() => prepareRemaining(rows), /想定外の本文/);
});

test("日次補充でも対象日に承認待ちの個別文案を再利用する", () => {
  const planned = planCalendar([], new Date("2026-09-23T22:00:00Z"));
  const selected = planned.planned.filter((post) => {
    const key = keyFor({ topic_id: post.topicId, target_sns: post.targetSns, scheduled_at: post.scheduledAt });
    const [date, sns] = key.split(":");
    return Boolean(REMAINING[date]?.[sns]);
  });
  assert.equal(selected.length, 91);
  assert.ok(selected.every((post) => !["x", "note"].includes(post.targetSns)));
  for (const post of selected) {
    const [date, sns] = keyFor({ topic_id: post.topicId, target_sns: post.targetSns, scheduled_at: post.scheduledAt }).split(":");
    assert.equal(post.bodyText, REMAINING[date][sns].bodyText);
    assert.equal(post.isPublishable, false);
    assert.equal(post.featurePublished, false);
  }
});
