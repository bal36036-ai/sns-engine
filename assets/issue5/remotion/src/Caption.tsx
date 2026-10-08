import { Interactive, interpolate, useCurrentFrame, Easing } from "remotion";
import { COLORS, FONT, SAFE_BOTTOM, SAFE_X } from "./theme";

// 画面下の字幕。44px以上、左右80px・下100pxの余白の内側に置く
export const Caption: React.FC<{ text: string; delay?: number; right?: number }> = ({ text, delay = 20, right = SAFE_X }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Caption"
      style={{
        position: "absolute",
        left: SAFE_X,
        right,
        bottom: SAFE_BOTTOM,
        padding: "18px 28px",
        borderRadius: 18,
        background: COLORS.navy,
        color: COLORS.white,
        fontFamily: FONT,
        fontSize: 44,
        fontWeight: 700,
        lineHeight: 1.35,
        textAlign: "center",
        whiteSpace: "pre-line",
        opacity: interpolate(frame, [delay, delay + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [delay, delay + 14], ["0px 24px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {text}
    </Interactive.Div>
  );
};
