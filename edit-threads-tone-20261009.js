// 2026-10-09 ばる「今の投稿質問ばっかでなんか機械的な気がする」→「お願いします」：予約済みのThreads（10/12〜11/8）のうち、質問が重なっている9本の本文を、質問を減らす形に直す。
// 意味・数字・「動作確認用の例」・ハリナビの注意文は変えない。質問を言い切りの終わり方に変えるだけ。直す前の本文は scheduling_reason.edited.before に残す。
// 使い方：node edit-threads-tone-20261009.js          … 確認のみ（差分を表示）
//         node edit-threads-tone-20261009.js --apply  … 本文を更新（status=ready・未投稿のものだけ）
const { getPool } = require("./db-client");

const EDITS = {
  "437fb6b4-0d90-4fde-b96b-bebf4e4be989": "「あとで使えそう」で残した端材。\nいざ使うときに、まず長さを測るところから始まる。あるあるです。\n\n長さを書いておく、置き場を分ける、一覧にする。やり方はいろいろありますが、どれも「次に使う人」に伝わるかどうかが分かれ目な気がします。",
  "903865c4-bbc6-4c72-84f0-b4c1e6783075": "図面の赤字、メモの追記、口頭で聞いた変更。\n情報がそろっていても、「いま使う数字はどれ？」と立ち止まる瞬間があります。\n\n現場へ渡す前に、変更した場所がすぐ見つかると助かります。寸法、数量、変更した箇所。受け取る側の目でも見直したいところです。",
  "2e78aeed-d762-4059-825f-b15bdad32478": "寸法は見つかった。数量は別のメモ。\nどちらも必要なのに、そろえるところで手が止まる。\n\n材料を切る前の、情報を集める作業。紙でそろえるか、データにまとめるか。ここに時間を取られがちです。",
  "15ecef64-b0d3-4daa-95ed-f0e1888126fd": "書いた本人には分かる、メモの略号。\n渡した先では「これは何のこと？」となる。\n\n加工場、現場、事務所。同じ仕事の話でも、いつもの呼び方が少し違うのかもしれません。\n伝わると思っていた呼び名で、聞き返されたものはありますか？",
  "26b4421d-25a5-4719-b837-04bfdd84d72b": "材料取りで手が止まるのは、切る順番を考えるとき、数量の変更を追うとき、それとも必要な情報をそろえるとき。\n\nここまで、並べ方や数量を変えた画面を見てきました。現場でいちばん「ここが面倒」と感じるところを聞きたいです。",
  "11b2473a-23d0-44c6-bdee-e874b96d3e0d": "道具を使う時間より、探す時間のほうが長く感じる日があります。\n「ここに戻す」が自分には分かっていても、次に使う人には分からないことも。\n置き場所まで共有できると、次の作業に入りやすそうです。",
  "45e21591-5709-47ed-9f58-eba9b63bbcbc": "作業は終わっているのに、次の人はまだ待っていた。そんな行き違いがあります。\n「終わった」と「伝わった」は、別々なのかもしれません。\n「終わったよ」と伝えるところまでが、ひとつの作業ですね。",
  "2b3c8b05-43e4-44c8-8629-ebb9660a2ead": "引き継ぎで「ここまでは済んでいます」と聞くとき。\nどこまで終わったかに加えて、何が残っているかも分かると、続きを始めやすいですよね。\n残りの作業をどう伝えるかで、次の人の動き出しが変わります。",
  "590d44d8-21c5-45e5-b45a-9a0ee488b6d5": "結果を見たあと、「もっと少ない本数にできないかな」と考えることがあります。\nキリドリの「自動」では、これ以上本数を減らせないと確認できたときに「最適」と表示します。\n動作確認用の例では「定尺2本より少なくする組み合わせはありません（計算で確認済み）」。\n部材が多いと確認しきれない場合があることも、画面に書いてあります。",
};
const BANNED = /テスター|唯一|業界初|世界初|市場にない|競合がない|保証します|必ず安全|フォローしてお待ちください|試せます|使ってみて|DMください|PipeNavi/;

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const [id, text] of Object.entries(EDITS)) {
      const r = (await c.query("SELECT id, status, external_post_id, scheduled_at, body_text, scheduling_reason FROM sns.posts WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!r) throw new Error(`${id}: 見つからない`);
      if (r.status !== "ready" || r.external_post_id) throw new Error(`${id}: 準備完了の未投稿ではない（${r.status}）`);
      if (new Date(r.scheduled_at).getTime() < Date.now() + 3600e3) throw new Error(`${id}: 予定が近すぎる`);
      if (BANNED.test(text) || [...text].length > 500) throw new Error(`${id}: 禁止表現/長さ`);
      // 数字・注意文が変わっていないこと
      for (const keep of (r.body_text.match(/[0-9][0-9,.]*(mm|本|%|t|kN|m)?/g) || []).filter((x) => x.length > 2)) if (!text.includes(keep)) throw new Error(`${id}: 数字 ${keep} が消えている`);
      if (r.body_text.includes("一次照査の補助") && !text.includes("一次照査の補助")) throw new Error(`${id}: ハリナビの注意文が消えている`);
      console.log(`${new Date(r.scheduled_at).toISOString().slice(5, 10)} ${id.slice(0, 8)}：質問 ${(r.body_text.match(/[？?]/g) || []).length}個 → ${(text.match(/[？?]/g) || []).length}個`);
      if (apply) {
        const prior = r.scheduling_reason && typeof r.scheduling_reason === "object" && !Array.isArray(r.scheduling_reason) ? r.scheduling_reason : {};
        const reason = { ...prior, edited: { at: new Date().toISOString(), why: "2026-10-09 ばる承認：質問が重なっている投稿を言い切りの終わり方に直した", before: r.body_text } };
        await c.query("UPDATE sns.posts SET body_text=$2, scheduling_reason=$3::jsonb, duplicate_check=NULL WHERE id=$1", [id, text, JSON.stringify(reason)]);
      }
    }
    await c.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "本文を更新しました" : "dry-run（--apply で実行）");
  } catch (e) { await c.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; }
  finally { c.release(); await pool.end(); }
})();
