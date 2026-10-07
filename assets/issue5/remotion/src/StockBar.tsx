import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS, PARTS, SAFE_X, STOCK_MM, W } from "./theme";

export type PartKey = keyof typeof PARTS;

export const BAR_W = W - SAFE_X * 2;
const PX_PER_MM = BAR_W / STOCK_MM;

// 定尺1本の切り出し図。左から右へ、さっと現れる。label は「1本目」などの見出し（40px）
export const StockBar: React.FC<{
  label: string;
  parts: PartKey[];
  remainMm: number;
  top: number;
  delay: number;
}> = ({ label, parts, remainMm, top, delay }) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [delay, delay + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const partsW = parts.reduce((s, k) => s + PARTS[k].mm * PX_PER_MM, 0);
  return (
    <Interactive.Div
      name={`Bar ${label}`}
      style={{
        position: "absolute",
        left: SAFE_X,
        top,
        width: BAR_W,
        opacity: interpolate(frame, [delay, delay + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.muted, marginBottom: 6, opacity: reveal }}>
        {label}　残り {remainMm.toLocaleString("en-US")}mm
      </div>
      <div
        style={{
          position: "relative",
          height: 90,
          borderRadius: 12,
          overflow: "hidden",
          border: `3px solid ${COLORS.navy}`,
          background: COLORS.white,
        }}
      >
        <div style={{ display: "flex", height: "100%", width: BAR_W, clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)` }}>
          {parts.map((k, i) => (
            <div
              key={`${k}${i}`}
              style={{
                width: PARTS[k].mm * PX_PER_MM,
                background: PARTS[k].color,
                color: COLORS.white,
                fontSize: 44,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight: `3px solid ${COLORS.white}`,
              }}
            >
              {PARTS[k].name}
            </div>
          ))}
          <div
            style={{
              width: BAR_W - partsW,
              background: "repeating-linear-gradient(135deg, #EADFC8 0 8px, #F6EFE0 8px 16px)",
            }}
          />
        </div>
      </div>
    </Interactive.Div>
  );
};
