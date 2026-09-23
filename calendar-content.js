// Issue #5: 媒体別の本文と制作案。制作案は投稿本文に混ぜない。
// 投稿経路の可否・公開可否・readiness はここでは変更しない。
const { FIRST_WEEK } = require("./first-week-content");

const CLOSES = [
  "まずは作業の順番を整理したい。",
  "見返したときに条件が追える形を考えています。",
  "一つの画面だけで判断しないための工夫です。",
  "使う場面を想像しながら、表示を見直しています。",
  "紙のメモと比べて、何が見やすいかを確かめたい。",
  "数字の意味が伝わる見せ方を探しています。",
  "入力の前に確認することを、置き去りにしたくない。",
  "前提条件をそろえるところから始めたい。",
  "例題で見たい情報を一つずつ確かめます。",
  "結果の次に必要な確認まで考えています。",
];

function productionPlan(topic, sns) {
  const [app, category, angle] = topic;
  const screen = app === "kiridori"
    ? "キリドリの条件入力・計画結果（実画面と表示項目を撮影前に確認）"
    : "ハリナビの条件入力・一次照査結果（実画面と表示項目を撮影前に確認）";
  if (sns === "instagram") {
    return {
      kind: "carousel_draft",
      screen,
      slides: [
        `1枚目｜${angle}、どこで迷う？`,
        `2枚目｜${category}として、作業の場面を整理`,
        `3枚目｜${screen}`,
        "4枚目｜入力条件と結果の見比べ方（実画面確認後に記入）",
        "最終枚｜見落としやすい点を一つ振り返る",
      ],
    };
  }
  if (sns === "tiktok" || sns === "youtube") {
    return {
      kind: "short_video_draft",
      duration_seconds: 24,
      screen,
      shots: [
        { seconds: "0-2", visual: "紙のメモか作業手元", telop: `${angle}、どう確認する？`, narration: "" },
        { seconds: "2-7", visual: "作業の前提を一つずつ示す", telop: "まず条件をそろえる", narration: "" },
        { seconds: "7-17", visual: screen, telop: "条件と表示を見比べる", narration: "実画面の確認後に文言を確定" },
        { seconds: "17-24", visual: "画面を止め、確認点を一つ示す", telop: "最後は人が条件を確認", narration: "" },
      ],
    };
  }
  if (sns === "note") {
    return {
      kind: "article_outline_draft",
      sections: ["導入｜実際に起きる場面", `課題｜${angle}`, "実例｜架空の作業条件と紙のメモ", "改善｜画面で比べたい情報（実画面確認後に記入）", "まとめ｜確認を省かずに手間を減らす"],
    };
  }
  return null;
}

function genericContent(topic, sns, variant, second, index) {
  const [app, category, angle] = topic;
  const appName = app === "kiridori" ? "キリドリ" : "ハリナビ";
  const close = CLOSES[index % CLOSES.length];
  const frame = ["作業メモ", "画面を見直すメモ", "次の検討メモ"][variant];
  const safety = app === "harinavi" ? "結果だけで安全を決めず、前提とあわせて確認します。" : "";
  let bodyText;
  if (sns === "threads") {
    bodyText = second
      ? `${frame}。${angle}。\n作業をやり直すなら、どこから確認するか。${close}`
      : variant % 2 === 0
        ? `${frame}｜${angle}。\n${category}を考えるとき、${appName}では条件と結果を一緒に見返せる形を検討しています。${safety}\n${close}`
        : `${category}の${frame}。\n${angle}。\n${close}${safety}`;
  } else if (sns === "x") {
    bodyText = `${frame}：${angle}。${close}`;
  } else if (sns === "instagram") {
    bodyText = `${frame}｜${angle}。\n\n条件を先にそろえてから、画面のどこを見ればよいか考えています。${safety}\n\n※画像は構成案。実画面と表記は制作時に確認します。`;
  } else if (sns === "note") {
    bodyText = `【記事案・${frame}】${angle}\n\n導入：この作業が起きる場面\n課題：確認に時間がかかるところ\n実例：架空の条件を使った比較\n改善：画面で見せたい情報（実画面確認後に確定）\nまとめ：${close}`;
  } else {
    bodyText = `${frame}｜${angle}を、作業の順番に沿って見直す。${safety}\n※画面・テロップは制作案。実素材の確認前です。`;
  }
  return { bodyText, plan: productionPlan(topic, sns) };
}

function contentFor({ date, topic, sns, variant, second = false, index = 0 }) {
  const first = FIRST_WEEK[date]?.[sns === "threads" && second ? "threads_b" : sns];
  if (first) return first;
  return genericContent(topic, sns, variant, second, index);
}

module.exports = { contentFor, genericContent, productionPlan };
