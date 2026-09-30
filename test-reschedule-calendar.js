const test = require("node:test");
const assert = require("node:assert/strict");
const { planReschedule } = require("./reschedule-calendar");

function row(id, sns, at, extra = {}) {
  return { id, topic_id: `cal-20260924-${id}`, target_sns: sns, scheduled_at: at,
    status: "draft", readiness_state: sns === "threads" ? "needs_review" : "waiting_media",
    is_historical: false, external_post_id: null, ...extra };
}

test("過去の下書きを先に移し、未来の下書きも空き枠へ順にずらす", () => {
  const now = new Date("2026-09-24T23:00:00Z"); // 9/25 08:00 JST
  const rows = [
    row("old", "threads", "2026-09-24T00:30:00Z"),
    row("today", "threads", "2026-09-25T00:30:00Z"),
    row("next", "threads", "2026-09-26T00:30:00Z"),
    row("legacy", "threads", "2026-09-25T10:30:00Z", { topic_id: "legacy-ready", status: "ready" }),
  ];
  const plan = planReschedule(rows, now);
  assert.equal(plan.overdue, 1);
  assert.deepEqual(plan.changes.map((change) => [change.id, change.to]), [
    ["old", "2026-09-25T00:30:00.000Z"],
    ["today", "2026-09-26T00:30:00.000Z"],
    ["next", "2026-09-26T08:00:00.000Z"],
  ]);
  assert.ok(plan.changes.every((change) => change.id !== "legacy"));
});

test("未接続のnoteは予定日時を消し、接続済みのXは空き枠へ移し、実績とreadyは固定する", () => {
  const now = new Date("2026-09-24T23:00:00Z");
  const rows = [
    row("x", "x", "2026-09-24T02:00:00Z"),
    row("note", "note", "2026-09-28T23:00:00Z"),
    row("historical", "instagram", "2026-09-24T03:45:00Z", { is_historical: true }),
    row("sent", "tiktok", "2026-09-24T09:15:00Z", { status: "sent", external_post_id: "existing" }),
    row("ready", "threads", "2026-09-24T00:30:00Z", { status: "ready" }),
  ];
  const plan = planReschedule(rows, now);
  const byId = Object.fromEntries(plan.changes.map((change) => [change.id, change.to]));
  assert.equal(byId.note, null); // noteは未接続のまま日時を消す
  assert.ok(byId.x && new Date(byId.x) > now); // Xは2026-10-01に接続済み。過去の枠は未来の空き枠（12:15）へ
  assert.equal(new Date(byId.x).toISOString().slice(11, 16), "03:15");
  assert.deepEqual(Object.keys(byId).sort(), ["note", "x"]);
  assert.equal(plan.overdue, 1); // 過去日時の接続済み下書き（x）の1件
});

test("変更後の日時を再入力しても同じ投稿を再移動しない", () => {
  const now = new Date("2026-09-24T23:00:00Z");
  const first = planReschedule([row("old", "tiktok", "2026-09-24T09:15:00Z")], now);
  assert.equal(first.changes.length, 1);
  const second = planReschedule([row("old", "tiktok", first.changes[0].to)], now);
  assert.equal(second.changes.length, 0);
});
