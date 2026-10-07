import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Caption } from "./Caption";
import { Headline } from "./Headline";
import { SceneFrame } from "./SceneFrame";
import { COLORS, PARTS, SAFE_X, W } from "./theme";

const Chip: React.FC<{ delay: number; top: number; color?: string; children: React.ReactNode; name: string }> = ({
  delay,
  top,
  color,
  children,
  name,
}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        left: SAFE_X,
        top,
        width: W - SAFE_X * 2,
        height: 100,
        borderRadius: 18,
        background: COLORS.white,
        border: `3px solid ${COLORS.line}`,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 32px",
        fontSize: 52,
        fontWeight: 800,
        opacity: interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(frame, [delay, delay + 16], ["60px 0px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {color ? <div style={{ width: 56, height: 56, borderRadius: 10, background: color }} /> : null}
      {children}
    </Interactive.Div>
  );
};

export const ConditionScene: React.FC = () => (
  <SceneFrame>
    <Headline lines={["条件は、これだけ"]} />
    <Chip name="Stock" delay={14} top={270}>
      定尺 6,000mm ／ 刃幅 5mm
    </Chip>
    <Chip name="Part A" delay={30} top={400} color={PARTS.A.color}>
      A　2,500mm × 2本
    </Chip>
    <Chip name="Part B" delay={44} top={520} color={PARTS.B.color}>
      B　1,800mm × 2本
    </Chip>
    <Chip name="Part C" delay={58} top={640} color={PARTS.C.color}>
      C　1,200mm × 2本
    </Chip>
    <Caption text="部材は全部で6本。切る順番だけ変えます" delay={70} />
  </SceneFrame>
);
