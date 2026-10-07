import { Audio } from "@remotion/media";
import { Series, staticFile } from "remotion";
import { LEAD_FRAMES, TOTAL_AUDIO_FRAMES, VOICE_FRAMES } from "./audioTiming";
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

// 場面の長さは、声の長さに合わせて tools/make_audio.py が決める（src/audioTiming.ts）
export const SCENE_FRAMES = VOICE_FRAMES;
export const TOTAL_FRAMES = TOTAL_AUDIO_FRAMES;

const Voice: React.FC<{ name: keyof typeof VOICE_FRAMES }> = ({ name }) => (
  <Audio src={staticFile(`audio/voice-${name}.wav`)} from={LEAD_FRAMES} volume={1} />
);

export const SortOrderVideo: React.FC = () => (
  <>
    {/* 曲：声の下で小さく流す（オリジナルの自作BGM。他人の曲は使っていない） */}
    <Audio src={staticFile("audio/bgm.wav")} volume={0.12} />
    <Series>
      <Series.Sequence name="Hook" durationInFrames={VOICE_FRAMES.hook}>
        <HookScene />
        <Voice name="hook" />
      </Series.Sequence>
      <Series.Sequence name="Condition" durationInFrames={VOICE_FRAMES.condition}>
        <ConditionScene />
        <Voice name="condition" />
      </Series.Sequence>
      <Series.Sequence name="Input order" durationInFrames={VOICE_FRAMES.input}>
        <ResultScene
          headline="書いた順に並べると"
          stocks={INPUT_ORDER}
          resultText="定尺 3本 ／ 歩留まり "
          highlight="61.1%"
          caption={"歩留まり＝使った定尺のうち、\n部材になった割合"}
        />
        <Voice name="input" />
      </Series.Sequence>
      <Series.Sequence name="Auto order" durationInFrames={VOICE_FRAMES.auto}>
        <ResultScene
          headline="自動で並べると"
          stocks={AUTO_ORDER}
          resultText="定尺 2本 ／ 歩留まり "
          highlight="91.7%"
          caption="同じ6本の部材が、定尺2本に収まりました"
        />
        <Voice name="auto" />
      </Series.Sequence>
      <Series.Sequence name="Question" durationInFrames={VOICE_FRAMES.question}>
        <QuestionScene />
        <Voice name="question" />
      </Series.Sequence>
    </Series>
  </>
);
