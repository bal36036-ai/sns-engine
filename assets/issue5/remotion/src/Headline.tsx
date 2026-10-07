import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS, SAFE_TOP, SAFE_X } from "./theme";

// 見出し。行ごとに少しずつ遅れて出る（84px以上）
export const Headline: React.FC<{ lines: string[]; size?: number; top?: number; color?: string }> = ({
  lines,
  size = 92,
  top = SAFE_TOP,
  color = COLORS.navy,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: SAFE_X, right: SAFE_X, top }}>
      {lines.map((line, i) => (
        <Interactive.Div
          key={line}
          name={`Headline ${i + 1}`}
          style={{
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.22,
            color,
            opacity: interpolate(frame, [i * 8, i * 8 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            translate: interpolate(frame, [i * 8, i * 8 + 16], ["0px 36px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {line}
        </Interactive.Div>
      ))}
    </div>
  );
};
