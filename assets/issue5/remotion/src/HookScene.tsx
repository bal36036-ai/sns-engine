import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Caption } from "./Caption";
import { Headline } from "./Headline";
import { SceneFrame } from "./SceneFrame";
import { COLORS, SAFE_X } from "./theme";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneFrame>
      <Headline lines={["同じ部材でも、", "並べる順番で", "定尺の本数が", "変わる？"]} size={104} />
      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          top: 700,
          fontSize: 56,
          fontWeight: 900,
          color: COLORS.orange,
          opacity: interpolate(frame, [40, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [40, 58], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        キリドリ（開発中）で試しました
      </div>
      <Caption text="数字は動作確認用の例です" delay={50} />
    </SceneFrame>
  );
};
