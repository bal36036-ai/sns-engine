import { Caption } from "./Caption";
import { Headline } from "./Headline";
import { SceneFrame } from "./SceneFrame";
import { Screen, ScreenNote } from "./Screen";

// 実画面：基本設定（定尺6,000mm・刃幅5mm）と部材リスト（A2,500×2／B1,800×2／C1,200×2）
const W_IMG = 740;
const LEFT = (1080 - W_IMG) / 2;

export const RealConditionScene: React.FC = () => (
  <SceneFrame>
    <Headline lines={["条件は、これだけ"]} size={84} />
    <ScreenNote top={208} />
    <Screen name="Conditions" file="conditions.png" srcW={1032} srcH={278} left={LEFT} top={262} width={W_IMG} appearAt={10} />
    {/* 部材リストは、部材の3行までを見せる（「部材を追加」より下は切る） */}
    <Screen name="Parts" file="parts.png" srcW={1032} srcH={764} cropBottom={0.67} left={LEFT} top={475} width={W_IMG} appearAt={112} />
    <Caption text="部材は全部で6本。並べる順番だけ変えます" delay={122} />
  </SceneFrame>
);
