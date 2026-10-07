import { Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COLORS } from "./theme";

// 実画面の画像（public/screens）。crop（0〜1）で下側を切って見せられる。appearAt でふわっと出て、hideAt から消える
export const Screen: React.FC<{
  file: string;
  left: number;
  top: number;
  width: number;
  srcW: number;
  srcH: number;
  cropBottom?: number;
  appearAt: number;
  hideAt?: number;
  name: string;
  children?: React.ReactNode;
}> = ({ file, left, top, width, srcW, srcH, cropBottom = 1, appearAt, hideAt, name, children }) => {
  const frame = useCurrentFrame();
  const h = Math.round((srcH * width) / srcW);
  const fadeOut = hideAt === undefined ? 1 : interpolate(frame, [hideAt, hideAt + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: Math.round(h * cropBottom),
        overflow: "hidden",
        borderRadius: 18,
        boxShadow: "0 10px 30px rgba(31,45,61,0.18)",
        border: `2px solid ${COLORS.line}`,
        background: COLORS.white,
        opacity: interpolate(frame, [appearAt, appearAt + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * fadeOut,
        translate: interpolate(frame, [appearAt, appearAt + 16], ["0px 40px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <Img src={staticFile(`screens/${file}`)} style={{ width, height: h, display: "block" }} />
      {children}
    </Interactive.Div>
  );
};

// 画像の中の一部を、オレンジの枠で囲む（位置は画像の幅・高さに対する割合）
export const Mark: React.FC<{ x: number; y: number; w: number; h: number; at: number; width: number; height: number }> = ({
  x,
  y,
  w,
  h,
  at,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x * width,
        top: y * height,
        width: w * width,
        height: h * height,
        border: `7px solid ${COLORS.orange}`,
        borderRadius: 18,
        opacity: interpolate(frame, [at, at + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        scale: interpolate(frame, [at, at + 12], [1.25, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          output: "perceptual-scale",
        }),
      }}
    />
  );
};

// 画面の上に出す小さな説明（実際のアプリ画面であること）
export const ScreenNote: React.FC<{ top: number; text?: string }> = ({ top, text = "キリドリの実際の画面（v66・動作確認用の例）" }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top, fontSize: 34, fontWeight: 700, color: COLORS.muted }}>{text}</div>
);
