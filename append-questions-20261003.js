// 2026-10-03 ばる「オッケー！」：今後2週間（10/3〜10/18）の準備完了のThreads・Xのうち、疑問符のない40件に、内容に合わせた質問を最後に足す（stage33：質問型が最も見られた）。
// 4件（ed7eecc2・e4100f73・6bf84f6a・ee1b4151）は、末尾の「アプリストア公開に向けて開発中です。」も取り除く（同じ一文が入った投稿の反応が低かった）。
// 変更する列：body_text のみ。古い本文は append-questions-20261003-before.json に保存。使い方：node append-questions-20261003.js [--apply]
const fs = require("fs");
const { getPool } = require("./db-client");
const Q = {
  "7a174831": "紙のメモと画面、確認するときはどちらを見ますか？",
  aa0598b5: "結果画面で「読みづらい」と感じるのは、どの部分ですか？",
  "8e716462": "結果の数字は、どこから見ますか？",
  "11c35ddc": "皆さんは、まず何から集めますか？",
  b087c763: "切り出し案を説明するとき、数字と図のどちらを先に見せますか？",
  "3f61d64b": "最初に確認するのは、定尺ですか？ 刃幅ですか？",
  "35f7ef20": "入力したあと、元の条件へ戻って確認していますか？",
  "84934744": "結果のそばに置いてほしい情報は、どれですか？",
  ec98053d: "結果を見る前に、何から整理しますか？",
  "7835348b": "結果のそばに欲しい項目は、何ですか？",
  c6daee57: "切り出し案は、図と数字のどちらで見ることが多いですか？",
  "066c7311": "端材を残すかどうかは、何で決めていますか？",
  "0d120325": "数字を写したあと、どこで照合していますか？",
  "1282fabe": "転記したあとの単位の確認は、どうしていますか？",
  "06503fed": "照合は、どの順番で行っていますか？",
  "1a434f32": "定尺の本数と端材、どちらを優先して見ますか？",
  "8c0c352e": "本数と端材、どちらを優先しますか？",
  a450ecd6: "本数が少ない案と、端材が使いやすい案。どちらを選ぶことが多いですか？",
  "5c2ac479": "結果の近くに、どんな説明があると助かりますか？",
  df0cba13: "結果のそばに、どんな説明があると助かりますか？",
  fba8a09e: "結果画面の説明は、どのくらいあると読みやすいですか？",
  d5c7430c: "切断メモには、何を必ず書きますか？",
  ed7eecc2: "切断メモを渡すとき、読み違えが起きやすいのはどこですか？",
  a5e2d3e9: "入力画面で迷いやすいのは、どの項目ですか？",
  f4685720: "入力欄は、多いほうがいいですか？ 少ないほうがいいですか？",
  f30aa544: "単位の入力で、間違えやすいのはどこですか？",
  e4100f73: "刃幅は、いくつで見ていますか？",
  "66fa2cf0": "端材は、残る長さと出どころのどちらを見ますか？",
  def26265: "材料取りの前に、刃幅は確認していますか？",
  a9bf1a25: "結果から条件へ戻る操作で、迷うことはありますか？",
  "8aa21820": "結果を共有するとき、前提をどう添えていますか？",
  "1c1198c7": "端材の数字は、残り寸法だけで足りますか？",
  e6523e58: "材料の呼び方は、どうそろえていますか？",
  c165c1db: "端材が「使える」かどうかは、何で判断しますか？",
  "6bf84f6a": "結果から入力へ戻るとき、迷う場所はありますか？",
  "6c6423b6": "検討の履歴は、どんな形で残していますか？",
  "44aaf0a1": "条件を直したあと、変更点をどう確かめていますか？",
  e2c9123c: "材料の呼び方は、現場でどうそろえていますか？",
  f426312b: "切り出し案は、事務所と現場のどちらで確認しますか？",
  ee1b4151: "材料名や規格は、どの段階でそろえていますか？",
};
const STRIP = new Set(["ed7eecc2", "e4100f73", "6bf84f6a", "ee1b4151"]);
const DEV = /\s*アプリストア公開に向けて開発中です。\s*$/;
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|フォローして見守って/;
const xWeight = (t) => [...t].reduce((w, ch) => { const c = ch.codePointAt(0); return w + ((c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2); }, 0);

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const client = await pool.connect(); const log = [];
  try {
    await client.query("BEGIN");
    for (const [id8, q] of Object.entries(Q)) {
      const { rows } = await client.query("SELECT id, target_sns, status, scheduled_at, body_text FROM sns.posts WHERE id::text LIKE $1 FOR UPDATE", [`${id8}%`]);
      if (rows.length !== 1) throw new Error(`${id8}: 該当 ${rows.length}件`);
      const r = rows[0];
      if (r.status !== "ready" || r.body_text.includes("？")) throw new Error(`${id8}: 対象外（${r.status}）`);
      if (new Date(r.scheduled_at) < new Date(Date.now() + 20 * 60e3)) throw new Error(`${id8}: 予定が直近のため対象外`);
      let base = r.body_text;
      if (STRIP.has(id8)) { if (!DEV.test(base)) throw new Error(`${id8}: 開発中の一文がない`); base = base.replace(DEV, ""); }
      const text = r.target_sns === "x" ? `${base} ${q}` : `${base}\n\n${q}`;
      const size = r.target_sns === "x" ? xWeight(text) : [...text].length;
      if (size > (r.target_sns === "x" ? 280 : 500)) throw new Error(`${id8}: 長すぎる ${size}`);
      if (BANNED.test(text)) throw new Error(`${id8}: 禁止表現`);
      const dup = await client.query("SELECT 1 FROM sns.posts WHERE target_sns = $1 AND body_text = $2 AND id <> $3", [r.target_sns, text, r.id]);
      if (dup.rowCount) throw new Error(`${id8}: 同じ本文が既にある`);
      log.push({ id: r.id, sns: r.target_sns, before: r.body_text, after: text });
      if (apply) await client.query("UPDATE sns.posts SET body_text = $2 WHERE id = $1 AND status = 'ready'", [r.id, text]);
    }
    console.log(`対象 ${log.length}件（X ${log.filter((l) => l.sns === "x").length}・Threads ${log.filter((l) => l.sns === "threads").length}）`);
    if (apply) fs.writeFileSync("append-questions-20261003-before.json", JSON.stringify(log, null, 1), "utf8");
    await client.query(apply ? "COMMIT" : "ROLLBACK"); console.log(apply ? "COMMIT" : "dry-run");
  } catch (e) { await client.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { client.release(); await pool.end(); }
})();
