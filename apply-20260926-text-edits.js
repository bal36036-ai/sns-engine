// 2026-09-26 編集長レビューの反映（ばる承認「全部おすすめで」）。
// 1) 要修正のThreads 10件の本文を差し替える
// 2) フォローの呼びかけ（CTA）を減らす：確認待ちのThreadsだけが対象。予定順に3件に1件だけ残し、
//    読者に質問する投稿には付けない。Instagram・TikTok・YouTubeは変更しない。
// 条件：status=draft・readiness_state=needs_review・未投稿の投稿に限る。body_text 以外は変更しない。
// 使い方：node apply-20260926-text-edits.js        … 変更案を表示（dry-run）
//         node apply-20260926-text-edits.js --apply … 実際に更新

const { getPool } = require("./db-client");

const CTAS = [
  "アプリストア公開に向けて開発中です。フォローしてお待ちください。",
  "開発の記録はこのアカウントで発信していきます。",
  "公開まで、こんな感じで開発の様子を発信していきます。",
];

// 要修正10件：CTAを除いた本文。CTAを付けるかは下の間引きルールで決める。
const FIXES = {
  // 書きかけの文章
  d5a94998: "数日たってから、メモに残した計算結果を見返すことがあります。数字は合っていても、そのときのスパンや荷重が書いていないと、条件を探すところからやり直しです。ハリナビでは、結果と入力条件を一緒に残せる形を考えています。",
  "147b5b71": "計算結果を人に渡すとき、数字だけ送ると「この荷重はどこから？」と聞き返されることがあります。条件と結果がセットで見られれば、確認の往復を減らせるかもしれません。",
  // 制作メモの混入・画像がないのに「見てみます」
  b087c763: "切り出し案を説明するとき、数字だけより図があるほうが伝わる場面があります。キリドリでは、定尺1本の中にどの部材が入り、どれだけ残るかを図で確認できます。",
  "1c1198c7": "端材の長さだけを見ても、それが何を切った残りなのかは分かりません。キリドリの切り出し図では、残る長さと一緒に、その材料から切る部材も並んで見えます。",
  "7394cc1d": "歩留まりの割合は、ひと目で比べやすい数字です。ただ、割合だけを先に読むのではなく、使う定尺の本数と残る端材も一緒に確認したいところです。キリドリの結果でも、歩留まりと一緒に本数や端材を確認できます。",
  a727c0be: "紙のメモをなくす話ではありません。現場のメモは、その場で書けるのが強いです。キリドリで手伝いたいのは、そのメモをもとに切り方を考える段階です。",
  // 質問文の位置（質問で終わる形にする）
  "2b01b67f": "梁を確認する前に、荷重や支持の条件をどこに書いたか探すところから始まることがあります。ハリナビの画面を考えるときも、結果より先に「何を条件として入れたか」を追えることを大切にしています。\n\n確認前に必ずそろえる情報があれば教えてください。",
  "540d1c68": "計算の結果を読むとき、元の前提条件が近くにあると見返しやすいはず。ハリナビでは、結果だけを切り離して見せないための画面の流れを考えています。\n\n結果画面で、真っ先に見返したい情報は何ですか？",
  "9c159ab5": "梁の一次照査の補助結果を別の人へ伝えるとき、数字だけ送っても前提が伝わりません。入力条件と確認した項目を、どの順で添えるか考えています。\n\n共有するとき、他にどんな情報があると伝わりやすいと思いますか？",
  b4d206a9: "結果を共有するなら、文章で条件を説明するのか、画面を見ながら説明するのか。受け取る人が元の前提をたどれることが大切です。共有時に欠かせない情報があれば知りたいです。",
};

const QUESTION = /？|\?|教えて|知りたい|参考にしたい|参考になります|参考にします/;

function splitCta(body) {
  for (const cta of CTAS) {
    const marker = `\n\n${cta}`;
    const at = body.indexOf(marker);
    if (at >= 0) return { core: (body.slice(0, at) + body.slice(at + marker.length)).trimEnd(), cta };
  }
  return { core: body.trimEnd(), cta: null };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, target_app, target_sns, body_text, scheduled_at, status, readiness_state, external_post_id, is_historical
         FROM sns.posts
        WHERE target_sns = 'threads' AND status = 'draft' AND readiness_state = 'needs_review'
          AND external_post_id IS NULL AND is_historical = false
        ORDER BY scheduled_at, id
        FOR UPDATE`
    );
    const fixedSeen = new Set();
    let kept = 0, removed = 0, changed = 0;
    rows.forEach((post, index) => {
      const prefix = post.id.slice(0, 8);
      const { core, cta } = splitCta(post.body_text);
      const newCore = FIXES[prefix] ?? core;
      if (FIXES[prefix]) fixedSeen.add(prefix);
      const isQuestion = QUESTION.test(newCore);
      const keepCta = index % 3 === 0 && !isQuestion;
      const ctaText = cta || CTAS[index % CTAS.length];
      const next = keepCta ? `${newCore}\n\n${ctaText}` : newCore;
      if (keepCta) kept++; else if (cta) removed++;
      if (next !== post.body_text) {
        changed++;
        post.next = next;
        const when = new Date(new Date(post.scheduled_at).getTime() + 9 * 3600e3).toISOString().slice(5, 16).replace("T", " ");
        console.log(`\n[${when}] ${prefix} ${post.target_app}${FIXES[prefix] ? " ★本文修正" : ""}${keepCta ? " CTA残す" : ""}`);
        console.log(`  前: ${post.body_text.replace(/\n/g, "⏎")}`);
        console.log(`  後: ${next.replace(/\n/g, "⏎")}`);
      }
    });
    const missing = Object.keys(FIXES).filter((k) => !fixedSeen.has(k));
    if (missing.length) throw new Error(`修正対象が見つからない: ${missing.join(", ")}`);
    console.log(`\n対象Threads ${rows.length}件／変更 ${changed}件／CTAを残す ${kept}件／CTAを外す ${removed}件`);
    if (apply) {
      for (const post of rows.filter((p) => p.next)) {
        const res = await client.query(
          "UPDATE sns.posts SET body_text = $2 WHERE id = $1 AND status = 'draft' AND readiness_state = 'needs_review' AND external_post_id IS NULL",
          [post.id, post.next]
        );
        if (res.rowCount !== 1) throw new Error(`${post.id}: 更新件数 ${res.rowCount}`);
      }
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

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
