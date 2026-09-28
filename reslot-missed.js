// GitHub Actions の実行抜けで投稿できなかった承認済み投稿を、媒体ごとの次の空き枠へ入れ直して ready に戻す。
// 対象：引数で渡した投稿ID（先頭8文字）。status が expired、または遅延ポリシーで needs_review に戻ったもの（未投稿）に限る。
// 空き枠の決め方は reschedule-calendar.js と同じ（媒体別の時刻・曜日ごとの本数・同じ媒体と3時間以上あける）。
// ready / scheduled の投稿だけを「埋まっている枠」とみなす。入れ直し後に reschedule-calendar.js --apply で下書きを後ろへ送る。
// 変更する列：status・scheduled_at・guard_reason・error_detail・scheduling_reason（履歴を追記）。本文・素材・公開フラグは変更しない。
// 使い方：node reslot-missed.js <id8> [<id8> ...]          … dry-run
//         node reslot-missed.js <id8> [<id8> ...] --apply  … 反映
// 2026-09-28 ばる承認（期限切れは空き枠へ入れ直す方針）。

const { getPool } = require("./db-client");

const TIMES = { threads: ["09:30", "17:00"], instagram: ["12:45"], tiktok: ["18:15"], youtube: ["20:15"] };
const MIN_GAP_MS = 3 * 3600e3;
const MIN_LEAD_MS = 3600e3;
const JST_MS = 9 * 3600e3;

function dailyTarget(sns, day) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  if (sns === "threads") return 2;
  if (sns === "instagram") return [0, 1, 2, 3, 4].includes(dow) ? 1 : 0;
  if (sns === "tiktok") return [0, 2, 4, 6].includes(dow) ? 1 : 0;
  if (sns === "youtube") return [0, 1, 3, 5].includes(dow) ? 1 : 0;
  return 0;
}
const jstDay = (ms) => new Date(ms + JST_MS).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

async function main() {
  const apply = process.argv.includes("--apply");
  const prefixes = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!prefixes.length) throw new Error("投稿IDを指定してください");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const now = Date.now();
    for (const prefix of prefixes) {
      const { rows } = await client.query("SELECT * FROM sns.posts WHERE id::text LIKE $1 FOR UPDATE", [`${prefix}%`]);
      if (rows.length !== 1) throw new Error(`${prefix}: 該当 ${rows.length} 件`);
      const post = rows[0];
      const late = post.status === "needs_review" && /遅延投稿ポリシー/.test(post.guard_reason || "");
      if (!(post.status === "expired" || late) || post.external_post_id || !post.is_publishable) {
        throw new Error(`${prefix}: 入れ直しの対象ではない (${post.status} / ${post.guard_reason})`);
      }
      const sns = post.target_sns;
      const fixed = await client.query(
        "SELECT scheduled_at FROM sns.posts WHERE target_sns = $1 AND status IN ('ready','scheduled') AND scheduled_at > now()",
        [sns]
      );
      const taken = fixed.rows.map((r) => new Date(r.scheduled_at).getTime());
      let chosen = null;
      for (let offset = 0; offset < 60 && !chosen; offset++) {
        const day = addDays(jstDay(now), offset);
        const count = taken.filter((t) => jstDay(t) === day).length;
        if (count >= dailyTarget(sns, day)) continue;
        for (const time of TIMES[sns]) {
          const at = new Date(`${day}T${time}:00+09:00`).getTime();
          if (at < now + MIN_LEAD_MS) continue;
          if (taken.some((t) => Math.abs(t - at) < MIN_GAP_MS)) continue;
          chosen = at;
          break;
        }
      }
      if (!chosen) throw new Error(`${prefix}: 60日以内に空き枠がない`);
      const history = { ...(post.scheduling_reason || {}) };
      history.reslot_history = [...(history.reslot_history || []), {
        at: new Date().toISOString(), from: post.scheduled_at, to: new Date(chosen).toISOString(), from_status: post.status,
        reason: "GitHub Actionsの実行抜けで投稿できなかったため、次の空き枠へ入れ直し（ばる承認の方針）",
      }];
      console.log(`${post.id} ${sns}: ${new Date(post.scheduled_at).toISOString()} -> ${new Date(chosen).toISOString()} (${post.status} -> ready)`);
      if (apply) {
        const res = await client.query(
          `UPDATE sns.posts SET status = 'ready', scheduled_at = $2, guard_reason = NULL, error_detail = NULL, scheduling_reason = $3
            WHERE id = $1 AND external_post_id IS NULL`,
          [post.id, new Date(chosen).toISOString(), JSON.stringify(history)]
        );
        if (res.rowCount !== 1) throw new Error(`${prefix}: 更新件数 ${res.rowCount}`);
      }
      taken.push(chosen);
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "COMMIT" : "dry-run：変更なし（--apply で更新）");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error("ERROR:", error.message); process.exit(1); });
