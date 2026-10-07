import { Composition, Folder } from "remotion";
import { ConditionScene } from "./ConditionScene";
import { HookScene } from "./HookScene";
import { QuestionScene } from "./QuestionScene";
import { ResultScene } from "./ResultScene";
import { AUTO_ORDER, INPUT_ORDER, SCENE_FRAMES, SortOrderVideo, TOTAL_FRAMES } from "./SortOrderVideo";
import { FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="SortOrder-Scenes">
        <Composition id="Hook" component={HookScene} width={W} height={H} fps={FPS} durationInFrames={SCENE_FRAMES.hook} />
        <Composition id="Condition" component={ConditionScene} width={W} height={H} fps={FPS} durationInFrames={SCENE_FRAMES.condition} />
        <Composition
          id="InputOrder"
          component={ResultScene}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={SCENE_FRAMES.input}
          defaultProps={{
            headline: "書いた順に並べると",
            stocks: INPUT_ORDER,
            resultText: "定尺 3本 ／ 歩留まり ",
            highlight: "61.1%",
            caption: "歩留まり＝使った定尺のうち、\n部材になった割合",
          }}
        />
        <Composition
          id="AutoOrder"
          component={ResultScene}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={SCENE_FRAMES.auto}
          defaultProps={{
            headline: "自動で並べると",
            stocks: AUTO_ORDER,
            resultText: "定尺 2本 ／ 歩留まり ",
            highlight: "91.7%",
            caption: "同じ6本の部材が、定尺2本に収まりました",
          }}
        />
        <Composition id="Question" component={QuestionScene} width={W} height={H} fps={FPS} durationInFrames={SCENE_FRAMES.question} />
      </Folder>
      <Composition id="SortOrderVideo" component={SortOrderVideo} width={W} height={H} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    </>
  );
};
