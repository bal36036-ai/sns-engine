// 2026-10-02 ばる依頼「投稿の分析して書き直してください」：夜間の自動補充が作った定型文（「画面を見直すメモ｜…」）のThreads6件・X5件を、
// 反応の分析（stage33）に沿って書き直す。実画面から取得済みの数字（assets/issue5/media2/source の結果テキスト）だけを使う。
// 変更する列：body_text のみ（状態・日時・公開フラグは変えない。確認待ちのまま、ばるの承認後にreadyへ）。古い本文は rewrite-20261002-before.json に保存。
// 使い方：node apply-20261002-rewrite-template-drafts.js [--apply]
const fs = require("fs");
const { getPool } = require("./db-client");

const THREADS = {
  d4c9eccc: `同じ部材でも、並べる順番で必要な定尺の本数が変わります。

キリドリの動作確認用の例（定尺6,000mm・刃幅5mm・部材6本）で、並び替えを切り替えてみました。
・入力順：3本（歩留まり61.1%）
・自動：2本（歩留まり91.7%）

手で材料取りをするとき、長い部材から割り付けますか？ それとも書いた順ですか？`,
  a2c18a85: `部材リストを入れる最初の手間。

キリドリの入力画面には、手入力のほかに「Excel/CSV」「PDF」「写真/OCR」の読み込みボタンが並んでいます（開発中）。

材料取りの元データは、普段どれに近いですか？
①Excelの一覧 ②PDFや紙の図面 ③手書きのメモ`,
  "9cc11b94": `吊り荷の質量を「t」で入れたとき、計算では何kNの力になるか、意識していますか？

ハリナビの入力欄には、質量の下に「2tは計算時に19.613kNへ換算します」と出ます。入れた数字が、どんな力として計算されるかをその場で見られる表示です。

質量（t）と力（kN）、現場では普段どちらで考えることが多いですか？
一次照査を補助するツールです。最終判断は専門家が条件を確認します。`,
  ac5b41b1: `支持条件が違うと、同じ荷重・同じスパンでも結果は変わります。

ハリナビの動作確認用の例（質量2t・スパン3,000mm）：
・単純支持：曲げ応力 69.7 N/mm²、たわみ 3.4mm
・両端固定：曲げ応力 41.4 N/mm²、たわみ 0.85mm

扱う梁は、どれに近いことが多いですか？ 単純支持／両端固定／片持ち
一次照査を補助するツールです。最終判断は専門家が条件を確認します。`,
  "5170dd71": `材料を切ると、刃の厚みの分だけ材料が減ります（刃幅・切りしろ）。

キリドリの動作確認用の例（定尺6,000mm・6回切る）：
・刃幅5mm：刃幅ロス30mm、合計端材970mm
・刃幅0mm：刃幅ロス0mm、合計端材1,000mm

小さな数字でも、切る回数が増えると効いてきます。皆さんの現場では、刃幅はいくつで見ていますか？`,
  "4f53a76f": `計画を保存するときの名前、どうつけますか？

キリドリの保存画面には、プラン名と保存先フォルダの欄があります。動作確認用の例では「切り出しプラン_日付」のように入れてみました（開発中）。

①日付 ②現場名 ③材料名 ④その他
探すとき、何で探すことが多いですか？`,
};
const X = {
  bc5faf16: `刃幅5mmで6回切ると、刃幅ロスは30mm。0mmなら0mm。キリドリの動作確認用の例です。小さな数字でも、切る回数が増えると効いてきます。刃幅、いくつで見ていますか？`,
  db8439ab: `同じ荷重・同じスパンでも、支持条件で結果は変わります。ハリナビの動作確認用の例（2t・3,000mm）：単純支持の曲げ応力は69.7 N/mm²、両端固定は41.4。一次照査の補助で、最終判断は専門家です。`,
  "065f5aad": `計画を保存するとき、名前は何で付けますか？ 日付・現場名・材料名…。キリドリの保存画面には、プラン名と保存先フォルダの欄があります（開発中）。`,
  c8319e66: `ハリナビの一次照査では、曲げ応力・たわみ・せん断応力などを順に見ます。動作確認用の例では、入力・計算した項目はすべて許容範囲内でOK。ただしOKは、その項目だけの判定です。最終判断は専門家が行います。`,
  "17869597": `部材は同じでも、並び替えで定尺の本数が変わります。キリドリの動作確認用の例：入力順は3本・歩留まり61.1%、自動は2本・91.7%。長い部材から割り付けますか？ 書いた順ですか？`,
};
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|フォローして見守って/;
const xWeight = (t) => [...t].reduce((w, ch) => { const c = ch.codePointAt(0); return w + ((c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2); }, 0);

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  const before = [];
  try {
    await client.query("BEGIN");
    for (const [sns, set] of [["threads", THREADS], ["x", X]]) {
      for (const [id8, text] of Object.entries(set)) {
        const { rows } = await client.query("SELECT id, status, readiness_state, topic_id, body_text FROM sns.posts WHERE id::text LIKE $1 AND target_sns = $2 FOR UPDATE", [`${id8}%`, sns]);
        if (rows.length !== 1) throw new Error(`${id8}: 該当 ${rows.length}件`);
        const r = rows[0];
        if (r.status !== "draft" || r.readiness_state !== "needs_review") throw new Error(`${id8}: 状態 ${r.status}/${r.readiness_state}`);
        if (!/画面を見直すメモ|見直すメモ/.test(r.body_text)) throw new Error(`${id8}: 定型文ではない（本文が変更されている）`);
        if (BANNED.test(text)) throw new Error(`${id8}: 禁止表現`);
        const limit = sns === "x" ? 280 : 500;
        const size = sns === "x" ? xWeight(text) : [...text].length;
        if (size > limit) throw new Error(`${id8}: 長すぎる ${size}/${limit}`);
        const dup = await client.query("SELECT 1 FROM sns.posts WHERE target_sns = $1 AND body_text = $2 AND id <> $3", [sns, text, r.id]);
        if (dup.rowCount) throw new Error(`${id8}: 同じ本文が既にある`);
        before.push({ id: r.id, sns, topic_id: r.topic_id, before: r.body_text, after: text });
        console.log(`${sns.padEnd(7)} ${id8} ${size}/${limit}`);
        if (apply) await client.query("UPDATE sns.posts SET body_text = $2 WHERE id = $1 AND status = 'draft'", [r.id, text]);
      }
    }
    if (apply) fs.writeFileSync("rewrite-20261002-before.json", JSON.stringify(before, null, 1), "utf8");
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "COMMIT（11件）" : "dry-run：変更なし");
  } catch (e) { await client.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { client.release(); await pool.end(); }
})();
