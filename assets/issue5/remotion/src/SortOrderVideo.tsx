import { Series } from "remotion";
import { ConditionScene } from "./ConditionScene";
import { HookScene } from "./HookScene";
import { QuestionScene } from "./QuestionScene";
import { ResultScene, Stock } from "./ResultScene";

// 実画面（キリドリ）で確認した動作確認用の例。定尺6,000mm・刃幅5mm・部材 A2,500×2／B1,800×2／C1,200×2
// 入力順：定尺3本・合計端材6,970mm・歩留まり61.1%／自動：定尺2本・合計端材970mm・歩留まり91.7%
export const INPUT_ORDER: Stock[] = [
  { label: "1本目", parts: ["A", "A"], remainMm: 990 },
  { label: "2本目", parts: ["B", "B", "C"], remainMm: 1185 },
  { label: "3本目", parts: ["C"], remainMm: 4795 },
];
export const AUTO_ORDER: Stock[] = [
  { label: "1本目", parts: ["A", "B", "C"], remainMm: 485 },
  { label: "2本目", parts: ["A", "B", "C"], remainMm: 485 },
];

export const SCENE_FRAMES = { hook: 105, condition: 135, input: 135, auto: 135, question: 120 } as const;
export const TOTAL_FRAMES = Object.values(SCENE_FRAMES).reduce((a, b) => a + b, 0);

export const SortOrderVideo: React.FC = () => (
  <Series>
    <Series.Sequence name="Hook" durationInFrames={105}>
      <HookScene />
    </Series.Sequence>
    <Series.Sequence name="Condition" durationInFrames={135}>
      <ConditionScene />
    </Series.Sequence>
    <Series.Sequence name="Input order" durationInFrames={135}>
      <ResultScene
        headline="書いた順に並べると"
        stocks={INPUT_ORDER}
        resultText="定尺 3本 ／ 歩留まり "
        highlight="61.1%"
        caption={"歩留まり＝使った定尺のうち、\n部材になった割合"}
      />
    </Series.Sequence>
    <Series.Sequence name="Auto order" durationInFrames={135}>
      <ResultScene
        headline="自動で並べると"
        stocks={AUTO_ORDER}
        resultText="定尺 2本 ／ 歩留まり "
        highlight="91.7%"
        caption="同じ6本の部材が、定尺2本に収まりました"
      />
    </Series.Sequence>
    <Series.Sequence name="Question" durationInFrames={120}>
      <QuestionScene />
    </Series.Sequence>
  </Series>
);
