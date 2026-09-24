const test = require("node:test");
const assert = require("node:assert/strict");
const { FIRST_WEEK } = require("./first-week-content");
const { prepareReview, PREVIOUS_BODY_HASHES } = require("./apply-issue5-review");
const { productionPlan } = require("./calendar-content");
const { TOPICS } = require("./calendar-topics");

function reviewRows() {
  return Object.entries(FIRST_WEEK).flatMap(([date, items]) =>
    Object.entries(items).map(([sns, content], index) => ({
      id: `${date}:${sns}`,
      topic_id: `cal-${date.replaceAll("-", "")}-${sns === "threads_b" ? "b" : "a"}`,
      target_sns: sns === "threads_b" ? "threads" : sns,
      scheduled_at: `${date}T09:30:00+09:00`,
      body_text: content.bodyText,
      status: "draft",
      readiness_state: "needs_review",
      media_urls: [],
      is_historical: false,
      is_publishable: false,
      feature_published: false,
    }))
  );
}

test("再レビューのDB更新対象は固定の5本文だけ", () => {
  assert.deepEqual(Object.keys(PREVIOUS_BODY_HASHES), [
    "2026-09-24:instagram", "2026-09-25:youtube", "2026-09-27:threads",
    "2026-09-29:x", "2026-09-29:instagram",
  ]);
  const rows = reviewRows();
  assert.equal(prepareReview(rows).length, 0);
  rows[0].body_text = "想定外の変更";
  assert.throws(() => prepareReview(rows), /想定外の本文/);
  rows[0].body_text = FIRST_WEEK["2026-09-24"].threads.bodyText;
  rows[0].status = "ready";
  assert.throws(() => prepareReview(rows), /安全条件/);
});

test("日次補充の素材案は保存導線と実画面フックを持つ", () => {
  const carousel = productionPlan(TOPICS[0], "instagram");
  assert.match(carousel.slides.at(-1), /保存/);
  assert.doesNotMatch(carousel.slides.at(-1), /？/);
  const short = productionPlan(TOPICS[0], "youtube");
  assert.match(short.shots[0].visual, /結果画面/);
  assert.match(short.shots.at(-1).telop, /条件と結果/);
  const safety = productionPlan(TOPICS[1], "tiktok");
  assert.match(safety.note, /安全上の注意/);
});
