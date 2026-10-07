import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "./theme";

// 場面の背景。先頭の8フレームで、ふわっと出る
export const SceneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: COLORS.paper,
        fontFamily: FONT,
        color: COLORS.navy,
        opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22, background: COLORS.orange }} />
      {children}
    </AbsoluteFill>
  );
};
