const test = require("node:test");
const assert = require("node:assert/strict");
const { FIRST_WEEK } = require("./first-week-content");
const { planCalendar } = require("./maintain-calendar");
const { prepare, keyFor } = require("./apply-first-week-content");

function allEntries() {
  return Object.entries(FIRST_WEEK).flatMap(([date, items]) =>
    Object.entries(items).map(([sns, content]) => ({ date, sns, ...content }))
  );
}

test("直近7日分の31件を媒体別に用意し、固定の開発紹介を連投しない", () => {
  const entries = allEntries();
  assert.equal(entries.length, 31);
  assert.deepEqual(entries.reduce((acc, item) => {
    const sns = item.sns === "threads_b" ? "threads" : item.sns;
    acc[sns] = (acc[sns] || 0) + 1;
    return acc;
  }, {}), { threads: 12, x: 5, instagram: 5, tiktok: 4, youtube: 4, note: 1 });
  assert.ok(entries.every((item) => item.bodyText?.trim() && !item.bodyText.includes("開発中です")));
  assert.equal(new Set(entries.map((item) => `${item.sns}\0${item.bodyText}`)).size, entries.length);
});

test("Threadsの連続投稿で同じ導入と終わり方を繰り返さない", () => {
  const threads = allEntries().filter((item) => item.sns.startsWith("threads"));
  for (let i = 1; i < threads.length; i++) {
    assert.notEqual(threads[i].bodyText.split(/[。\n]/)[0], threads[i - 1].bodyText.split(/[。\n]/)[0]);
    assert.notEqual(threads[i].bodyText.trim().split("\n").at(-1), threads[i - 1].bodyText.trim().split("\n").at(-1));
  }
});

test("画像・動画・noteに投稿単位の制作案があり、素材なしの下書きで止まる", () => {
  for (const item of allEntries()) {
    if (item.sns === "instagram") {
      assert.ok(item.plan?.slides?.length >= 5, `${item.date} Instagram`);
      assert.ok(item.plan?.candidateScreens?.length, `${item.date} Instagram画面`);
    }
    if (["tiktok", "youtube"].includes(item.sns)) {
      assert.ok(item.plan?.video?.length >= 4, `${item.date} ${item.sns}台本`);
      assert.ok(item.plan?.candidateScreens?.length, `${item.date} ${item.sns}画面`);
    }
    if (item.sns === "note") assert.ok(item.plan?.sections?.length >= 5);
  }
  const week = planCalendar([], new Date("2026-09-23T22:00:00Z"), 6);
  const selected = week.planned.filter((p) => {
    const [date, sns] = keyFor({ topic_id: p.topicId, target_sns: p.targetSns, scheduled_at: p.scheduledAt }).split(":");
    return Boolean(FIRST_WEEK[date]?.[sns]);
  });
  assert.equal(selected.length, 31);
  assert.ok(selected.every((p) => p.isPublishable === false && p.featurePublished === false && p.mediaUrls.length === 0));
});

test("対象が下書きの元文面から外れたら7日分を一括中止する", () => {
  const week = planCalendar([], new Date("2026-09-23T22:00:00Z"), 6);
  const rows = week.planned.filter((p) => {
    const [date, sns] = keyFor({ topic_id: p.topicId, target_sns: p.targetSns, scheduled_at: p.scheduledAt }).split(":");
    return Boolean(FIRST_WEEK[date]?.[sns]);
  }).map((p, i) => ({
    id: String(i), topic_id: p.topicId, target_sns: p.targetSns, scheduled_at: p.scheduledAt,
    body_text: "開発中です", status: "draft", readiness_state: "needs_review", is_historical: false,
    is_publishable: false, feature_published: false, media_urls: [],
  }));
  assert.equal(prepare(rows).length, 31);
  rows[0].status = "ready";
  assert.throws(() => prepare(rows), /安全条件/);
});
