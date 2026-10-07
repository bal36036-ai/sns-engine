import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Caption } from "./Caption";
import { Headline } from "./Headline";
import { SceneFrame } from "./SceneFrame";
import { COLORS, SAFE_X } from "./theme";

export const QuestionScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFrame>
      <Headline lines={["長い部材から？", "書いた順？"]} size={112} top={160} />
      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: 560,
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.orange,
          opacity: interpolate(frame, [30, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [30, 48], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        皆さんは、どちらで割り付けますか？
      </div>
      <Caption text="げんばアプリ工房｜キリドリ（開発中）" delay={50} />
    </SceneFrame>
  );
};
