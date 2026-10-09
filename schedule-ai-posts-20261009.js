// 2026-10-09 ばる決定：「建設×AI」の Threads 3本を、10/14・10/18・10/22 の 17:00 に追加する（今の 9:30 の投稿は、そのまま継続。置き換えない）。
// 案はChatGPT（Issue #5 2026-10-09 04:22 UTC）、Claudeが確認・編集（アプリ名は「配管ルートを作るアプリ（開発中）」に。最終表記が未定のため）。
// 3つの話（iPhoneから頼んだ／古いPDFを取っていた／材料表と図の進め方）は、ばる本人が「本当」と確認済み。
// 使い方：node schedule-ai-posts-20261009.js          … 確認のみ
//         node schedule-ai-posts-20261009.js --apply  … 登録→準備完了（Threadsは DB内の重複確認。投稿直前のCronでAPI側も確認される）
const { getPool } = require("./db-client");

const POSTS = [
  { date: "2026-10-14", key: "a1", title: "建設×AI｜スマホから頼んだあとの確認",
    body: "スマホで「ここを直して」と頼んでも、朝には完成しているとは限りませんでした。\n\n配管ルートを作るアプリ（開発中）を、AIと一緒に作っています。自分はiPhoneから相談し、自宅のパソコンのCodexで変更やテストを進める形です。\n\n任せて寝たあと、途中で止まっていたことも。今は「止まった理由と、次に必要なこと」も確認しています。\n\nAIに仕事を頼むなら、まずどの作業を任せてみたいですか？" },
  { date: "2026-10-18", key: "a2", title: "建設×AI｜「完了」のあと、実際のPDFを見る",
    body: "AIから「完了しました」。でも、確認していたPDFは前の表示のままでした。\n\n配管ルートを作るアプリ（開発中）であった話です。調べると、画面の設定が変わっただけで成功と判断し、古いPDFを取得していました。\n\n直したのは、アプリ本体ではなく確認の仕組み。「操作できたか」に加えて、出てきたファイルの中身まで確かめるようにしています。\n\n仕事のPDFで、最初に確認するのは寸法、数量、それとも別のところですか？" },
  { date: "2026-10-22", key: "a3", title: "建設×AI｜「PDFを良くして」を小さく分ける",
    body: "AIに「PDFを良くして」と頼む前に、何ができたら終わりかを決めています。\n\n配管ルートを作るアプリ（開発中）では、材料表のページ分けと、複数の向きの図を出す作業を分けて進めています。\n\nたとえば「項目が多くても文字が切れない。材料の数量や並び順は変えない」。これは頼み方の例です。\n\n変えるところと、残すところを決めてから、結果を確認します。\n\n材料表を見直すなら、まず直したいのは文字の見やすさですか？ ページの分かれ方ですか？" },
];
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|試せます|使ってみて|DMください|PipeNavi/;

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const p of POSTS) {
      const at = new Date(`${p.date}T17:00:00+09:00`);
      if (BANNED.test(p.body) || BANNED.test(p.title)) throw new Error(`${p.key}: 禁止表現`);
      if ([...p.body].length > 500) throw new Error(`${p.key}: 500字超`);
      if (at.getTime() < Date.now() + 3600e3) throw new Error(`${p.key}: 予定が近すぎる`);
      const busy = await c.query("SELECT id FROM sns.posts WHERE target_sns='threads' AND scheduled_at=$1 AND status IN ('ready','scheduled','draft')", [at.toISOString()]);
      if (busy.rowCount) throw new Error(`${p.key}: ${p.date} 17:00 の枠が埋まっている`);
      const dup = await c.query("SELECT id FROM sns.posts WHERE target_sns='threads' AND (md5(body_text)=md5($1) OR topic_id=$2)", [p.body, `ai-${p.date.replaceAll("-", "")}`]);
      if (dup.rowCount) throw new Error(`${p.key}: 同じ本文/topic が既にある`);
      console.log(`${p.date} 17:00 threads｜${p.title}（${[...p.body].length}字）`);
      if (apply) {
        await c.query(
          `INSERT INTO sns.posts (topic_id, target_app, target_sns, title, body_text, media_urls, scheduled_at, is_publishable, feature_published, status, readiness_state, scheduling_reason, duplicate_check)
           VALUES ($1,'brand','threads',$2,$3,'{}',$4,true,true,'ready','ready_candidate',$5,$6)`,
          [`ai-${p.date.replaceAll("-", "")}`, p.title, p.body, at.toISOString(),
            JSON.stringify({ source: "建設×AI 2週間の試し（ChatGPT案 2026-10-09、Claude編集）", approved: "bal 2026-10-09 Bで今の投稿もそのまま継続（17:00に追加）", note: "3つの話は本人が本当と確認済み。アプリ名は出さない（最終表記が未定）" }),
            JSON.stringify({ checked_at: new Date().toISOString(), result: "none_in_db", note: "DB内の重複なし。Threads APIでの重複確認は投稿直前のCronで実施", approved_by: "bal 2026-10-09" })]);
      }
    }
    await c.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "登録しました（準備完了 3件）" : "dry-run（--apply で実行）");
  } catch (e) { await c.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
