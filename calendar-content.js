// Issue #5: 媒体別の本文と制作案。制作案は投稿本文に混ぜない。
// 投稿経路の可否・公開可否・readiness はここでは変更しない。
const { FIRST_WEEK } = require("./first-week-content");
const { REMAINING } = require("./remaining-content");

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
const INSTAGRAM_CLOSES = [
  "あとで条件と結果を見比べられるよう保存してください。",
  "今日の要点は、入力条件と結果をセットで見ること。",
  "作業前に見る順番を、保存しておける一枚に。",
  "確認したい項目を、結果の近くで見返すためのメモに。",
];

function productionPlan(topic, sns, variant = 0, index = 0) {
  const [app, category, angle] = topic;
  const instagramClose = INSTAGRAM_CLOSES[(index + variant) % INSTAGRAM_CLOSES.length];
  const screen = app === "kiridori"
    ? "キリドリの条件入力・計画結果（実画面と表示項目を撮影前に確認）"
    : "ハリナビの条件入力・一次照査結果（実画面と表示項目を撮影前に確認）";
  if (sns === "instagram") {
    return {
      kind: "carousel_draft",
      screen,
      slides: [
        `1枚目｜${angle}（具体的な作業場面を示す）`,
        `2枚目｜${category}で確認する条件`,
        `3枚目｜${screen}`,
        "4枚目｜入力条件と結果をセットで確認（実画面確認後に記入）",
        `最終枚｜今回の確認点を一言でまとめる。${instagramClose}`,
      ],
      note: app === "harinavi" ? "安全上の注意は本文にも簡潔に残す。最終枚を免責だけで終わらせない。" : "質問型の締めを連投しない。",
    };
  }
  if (sns === "tiktok" || sns === "youtube") {
    const openingVisual = app === "kiridori" ? "切り出し案の実結果画面（撮影前に照合）" : "一次照査の実結果画面（撮影前に照合）";
    const hooks = app === "kiridori"
      ? ["この切り出し案、元の条件は？", "定尺ごとの切り方を先に見る", "端材まで、結果画面で確認"]
      : ["この結果、どの条件で出た？", "数字を見る前に、入力条件へ", "結果と元の条件を並べて確認"];
    const openingTelop = hooks[(index + variant) % hooks.length];
    return {
      kind: "short_video_draft",
      duration_seconds: 24,
      screen,
      shots: [
        { seconds: "0-2", visual: openingVisual, telop: openingTelop, narration: "" },
        { seconds: "2-7", visual: "対応する入力画面", telop: "まず元の条件を確認", narration: "" },
        { seconds: "7-17", visual: screen, telop: `${category}の確認点を実画面で示す`, narration: "実画面の確認後に文言を確定" },
        { seconds: "17-24", visual: "条件と結果を並べた画面", telop: "条件と結果をセットで確認", narration: "" },
      ],
      note: app === "harinavi" ? "最後に安全上の注意を補足表示。数字や項目は実画面と照合し、最終判断を保証しない。" : "数字を使う場合は実画面の動作確認用の例と一致させる。",
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
  const close = CLOSES[(index + variant * 2 + (second ? 5 : 0)) % CLOSES.length];
  const frame = ["作業メモ", "画面を見直すメモ", "次の検討メモ"][variant];
  const instagramClose = INSTAGRAM_CLOSES[(index + variant) % INSTAGRAM_CLOSES.length];
  const safety = app === "harinavi" && index % 3 === 0 ? "一次照査の補助です。最終判断は専門家が条件を確認します。" : "";
  let bodyText;
  if (sns === "threads") {
    bodyText = second
      ? `${frame}。${angle}。\n入力した条件と結果を見返すとき、何を先に確認するか。${close}`
      : variant % 2 === 0
        ? `${frame}｜${angle}。\n${category}を考えるとき、${appName}では条件と結果を一緒に見返せる形を検討しています。${safety}\n${close}`
        : `${category}の${frame}。\n${angle}。\n${close}${safety}`;
  } else if (sns === "x") {
    bodyText = `${frame}：${angle}。${app === "harinavi" ? "梁の一次照査を補助する画面で、条件と結果を見返します。" : "入力した条件と切り出し案を見比べます。"}${close}`;
  } else if (sns === "instagram") {
    bodyText = `${frame}｜${angle}。\n\n入力した条件を先に確認し、結果のどこを見るかを順に追います。${safety}\n\n${instagramClose}\n※画像は構成案。実画面と表記は制作時に確認します。`;
  } else if (sns === "note") {
    bodyText = `【記事案・${frame}】${angle}\n\n導入：この作業が起きる場面\n課題：確認に時間がかかるところ\n実例：架空の条件を使った比較\n改善：画面で見せたい情報（実画面確認後に確定）\nまとめ：${close}`;
  } else {
    bodyText = `${frame}｜${angle}。実画面で入力条件から結果までを短く追います。${safety}\n※画面・テロップは制作案。実素材の確認前です。`;
  }
  return { bodyText, plan: productionPlan(topic, sns, variant, index) };
}

function contentFor({ date, topic, sns, variant, second = false, index = 0 }) {
  const key = sns === "threads" && second ? "threads_b" : sns;
  const first = FIRST_WEEK[date]?.[key];
  if (first) return first;
  const remaining = REMAINING[date]?.[key];
  if (remaining) return remaining;
  return genericContent(topic, sns, variant, second, index);
}

// 手書きの本文（FIRST_WEEK / REMAINING）がある日・媒体か
function hasHandWritten(date, sns, second = false) {
  const key = sns === "threads" && second ? "threads_b" : sns;
  return Boolean(FIRST_WEEK[date]?.[key] || REMAINING[date]?.[key]);
}

module.exports = { contentFor, genericContent, productionPlan, hasHandWritten };
