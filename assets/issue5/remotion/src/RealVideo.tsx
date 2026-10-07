import { Audio } from "@remotion/media";
import { Series, staticFile } from "remotion";
import { LEAD_FRAMES, TOTAL_AUDIO_FRAMES, VOICE_FRAMES } from "./audioTiming";
import { HookScene } from "./HookScene";
import { QuestionScene } from "./QuestionScene";
import { RealConditionScene } from "./RealConditionScene";
import { RealResultScene } from "./RealResultScene";

// 実画面版：キリドリ v66 の実画面（tools/capture-kiridori.cjs で撮影）を使う。声と曲は tools/make_audio.py。
// 枠を出す時刻は、声の中で「さんぼん」「にほん」「ぶどまり」を言う時刻（VOICEVOXの音の長さから計算）に合わせた。
export const REAL_TOTAL_FRAMES = TOTAL_AUDIO_FRAMES;

const Voice: React.FC<{ name: keyof typeof VOICE_FRAMES }> = ({ name }) => (
  <Audio src={staticFile(`audio/voice-${name}.wav`)} from={LEAD_FRAMES} volume={1} />
);

// bgm：曲のファイル名（public/audio）。bgmVolume：曲の音量（曲ごとの大きさの違いをそろえるため、曲だけの部分が約 -30dB になる値）
export const RealVideo: React.FC<{ bgm?: string; bgmVolume?: number }> = ({ bgm = "bgm.wav", bgmVolume = 0.12 }) => (
  <>
    <Audio src={staticFile(`audio/${bgm}`)} volume={bgmVolume} />
    <Series>
      <Series.Sequence name="Hook" durationInFrames={VOICE_FRAMES.hook}>
        <HookScene />
        <Voice name="hook" />
      </Series.Sequence>
      <Series.Sequence name="Condition" durationInFrames={VOICE_FRAMES.condition}>
        <RealConditionScene />
        <Voice name="condition" />
      </Series.Sequence>
      <Series.Sequence name="Input order" durationInFrames={VOICE_FRAMES.input}>
        <RealResultScene
          tag="inputorder"
          stocks={3}
          headline="「入力順」で並べると"
          caption={"歩留まり＝使った定尺のうち、\n部材になった割合"}
          switchAt={60}
          mark1At={70}
          mark2At={119}
        />
        <Voice name="input" />
      </Series.Sequence>
      <Series.Sequence name="Auto order" durationInFrames={VOICE_FRAMES.auto}>
        <RealResultScene
          tag="auto"
          stocks={2}
          headline="「自動」で並べると"
          caption="同じ6本の部材が、定尺2本に収まりました"
          switchAt={52}
          mark1At={63}
          mark2At={109}
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
