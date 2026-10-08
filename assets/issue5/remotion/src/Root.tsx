import { Composition, Folder } from "remotion";
import { ConditionScene } from "./ConditionScene";
import { HookScene } from "./HookScene";
import { QuestionScene } from "./QuestionScene";
import { ResultScene } from "./ResultScene";
import { AUTO_ORDER, INPUT_ORDER, SCENE_FRAMES, SortOrderVideo, TOTAL_FRAMES } from "./SortOrderVideo";
import { FPS, H, W } from "./theme";
import { RealVideo, REAL_TOTAL_FRAMES } from "./RealVideo";
import { calcSpecMetadata, SpecVideo } from "./SpecVideo";
import { calcDogMetadata, DogSkit } from "./DogSkit";
import { calcSpriteMetadata, SpriteSkit } from "./SpriteSkit";
import { calcCastMetadata, CastSkit } from "./CastSkit";
import { calcPuppetMetadata, PuppetDemo } from "./PuppetDemo";
import { calcPuppetCastMetadata, PuppetCast } from "./PuppetCast";
import { calcWorkshopCastMetadata, WorkshopCast } from "./WorkshopCast";
import { calcWorkSceneMetadata, WorkScene } from "./WorkScene";
import { calcVeoMetadata, VeoFinish } from "./VeoFinish";

// 台本データ（props/*.json）から作る動画。render時に --props=props/<名前>.json を渡す。
const EMPTY_SPEC = { scenes: [], bgm: "bgm-pop-long.wav", bgmVolume: 0.37 };

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
      <Composition id="SortOrderRealVideo" component={RealVideo} width={W} height={H} fps={FPS} durationInFrames={REAL_TOTAL_FRAMES} />
      <Composition id="SortOrderRealLofi" component={RealVideo} width={W} height={H} fps={FPS} durationInFrames={REAL_TOTAL_FRAMES} defaultProps={{ bgm: "bgm-lofi.wav", bgmVolume: 0.19 }} />
      <Composition id="SortOrderRealPop" component={RealVideo} width={W} height={H} fps={FPS} durationInFrames={REAL_TOTAL_FRAMES} defaultProps={{ bgm: "bgm-pop.wav", bgmVolume: 0.37 }} />
      <Composition id="SpecVideo" component={SpecVideo} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={EMPTY_SPEC} calculateMetadata={calcSpecMetadata} />
      <Composition id="DogSkit" component={DogSkit} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ lines: [], bgm: "bgm-pop-long.wav", bgmVolume: 0.3, credit: "" }} calculateMetadata={calcDogMetadata} />
      <Composition id="SpriteSkit" component={SpriteSkit} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ lines: [], bgm: "bgm-pop-long.wav", bgmVolume: 0.3, credit: "", sizes: {} }} calculateMetadata={calcSpriteMetadata} />
      <Composition id="CastSkit" component={CastSkit} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ cast: {}, lines: [], sizes: {}, bgm: "bgm-pop-long.wav", bgmVolume: 0.28, credit: "" }} calculateMetadata={calcCastMetadata} />
      <Composition id="PuppetDemo" component={PuppetDemo} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ rig: { dir: "rig/shuna", size: [302, 566], neckY: 248, pivot: [151, 240], mouth: { half: "mouth_half.png", open: "mouth_open.png", region: [120, 190, 185, 225] } }, lines: [], bgm: "bgm-pop-long.wav", bgmVolume: 0.3, credit: "" }} calculateMetadata={calcPuppetMetadata} />
      <Composition id="PuppetCast" component={PuppetCast} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ cast: {}, rigs: {}, lines: [], bgm: "bgm-pop-long.wav", bgmVolume: 0.28, credit: "" }} calculateMetadata={calcPuppetCastMetadata} />
      <Composition id="WorkshopCast" component={WorkshopCast} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ cast: {}, rigs: {}, lines: [], bg: "scene/bg_workshop.png", bgm: "bgm-pop-long.wav", bgmVolume: 0.28, credit: "" }} calculateMetadata={calcWorkshopCastMetadata} />
      <Composition id="WorkScene" component={WorkScene} width={W} height={H} fps={FPS} durationInFrames={30} defaultProps={{ actors: {}, rigs: {}, sizes: {}, lines: [], bg: "scene/bg_workshop.png", bgm: "bgm-pop-long.wav", bgmVolume: 0.28, credit: "", total: 30 }} calculateMetadata={calcWorkSceneMetadata} />
      <Composition id="VeoFinish" component={VeoFinish} width={1080} height={1920} fps={FPS} durationInFrames={30} defaultProps={{ clip: "veo/clip1.mp4", last: "veo/clip1-last.png", clipFrames: 300, total: 300, title: "", lines: [], bgm: "bgm-pop-long.wav", bgmVolume: 0.12, clipVolume: 0.6, credit: "" }} calculateMetadata={calcVeoMetadata} />
      <Composition id="SortOrderVideo" component={SortOrderVideo} width={W} height={H} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    </>
  );
};
