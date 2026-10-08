import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { COLORS, FONT } from "./theme";

// 会話劇の「最初の2秒」の試作（2026-10-09 ChatGPT企画 案2・案3）。手元の寄りの絵（背景）の上で、
// メモ・指・マグネットなどの切り抜き（layers）を動かし、話す人の一言（line）を出す。数字はAIの絵に描かせず、文字（texts）で重ねる。
type Pose = { x: number; y: number; scale?: number; rot?: number; opacity?: number };
export type OpLayer = { file: string; width: number; keys: { at: number; pose: Pose }[]; z?: number };
export type OpText = { text: string; x: number; y: number; size: number; color?: string; rot?: number; z?: number };
export type OpLine = { start: number; name: string; color: string; text: string; voice: string; lead: number; box?: { left: number; right: number; top?: number; bottom?: number } };
export type OpeningProps = { bg: string; zoom: [number, number]; layers: OpLayer[]; texts: OpText[]; lines: OpLine[]; label?: string; total: number; credit: string };

const ease = Easing.bezier(0.33, 1, 0.68, 1);

const poseAt = (keys: OpLayer["keys"], f: number): Pose => {
  if (f <= keys[0].at) return keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b.at) {
      const t = ease((f - a.at) / (b.at - a.at));
      const mix = (p: number | undefined, q: number | undefined, d: number) => (p ?? d) + ((q ?? d) - (p ?? d)) * t;
      return { x: mix(a.pose.x, b.pose.x, 0), y: mix(a.pose.y, b.pose.y, 0), scale: mix(a.pose.scale, b.pose.scale, 1), rot: mix(a.pose.rot, b.pose.rot, 0), opacity: mix(a.pose.opacity, b.pose.opacity, 1) };
    }
  }
  return keys[keys.length - 1].pose;
};

const Line: React.FC<{ l: OpLine }> = ({ l }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 7], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <div style={{ position: "absolute", left: l.box?.left ?? 70, right: l.box?.right ?? 70, ...(l.box?.top !== undefined ? { top: l.box.top } : { bottom: l.box?.bottom ?? 70 }), scale: `${s}`, opacity: interpolate(f, [0, 4], [0, 1], { extrapolateRight: "clamp" }), filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.3))" }}>
      <div style={{ display: "inline-block", marginLeft: 24, padding: "6px 22px", borderRadius: "16px 16px 0 0", background: l.color, color: COLORS.white, fontFamily: FONT, fontSize: 34, fontWeight: 900 }}>{l.name}</div>
      <div style={{ padding: "20px 34px", background: "rgba(255,255,255,0.96)", border: `5px solid ${l.color}`, borderRadius: 30, fontFamily: FONT, fontSize: 60, fontWeight: 900, color: COLORS.navy, textAlign: "center" }}>{l.text}</div>
      <Audio src={staticFile(`audio/${l.voice}`)} from={l.lead} volume={1} />
    </div>
  );
};

export const Opening: React.FC<OpeningProps> = (p) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, p.total], p.zoom, { extrapolateRight: "clamp" });
  const items = [
    ...p.layers.map((l, i) => ({ kind: "layer" as const, z: l.z ?? 10 + i, l })),
    ...p.texts.map((t, i) => ({ kind: "text" as const, z: t.z ?? 5 + i, t })),
  ].sort((a, b) => a.z - b.z);
  return (
    <AbsoluteFill style={{ background: "#2B2620", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, scale: `${z}` }}>
        <Img src={staticFile(p.bg)} style={{ position: "absolute", inset: 0, width: 1080, height: 1080, objectFit: "cover" }} />
        {items.map((it, i) => {
          if (it.kind === "text") {
            const t = it.t;
            return (
              <div key={i} style={{ position: "absolute", left: t.x, top: t.y, translate: "-50% -50%", rotate: `${t.rot ?? 0}deg`, fontFamily: FONT, fontWeight: 800, fontSize: t.size, color: t.color ?? "#2C5E9E" }}>
                {t.text}
              </div>
            );
          }
          const ps = poseAt(it.l.keys, f);
          return <Img key={i} src={staticFile(it.l.file)} style={{ position: "absolute", left: ps.x, top: ps.y, width: it.l.width, translate: "-50% -50%", scale: `${ps.scale ?? 1}`, rotate: `${ps.rot ?? 0}deg`, opacity: ps.opacity ?? 1, filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.25))" }} />;
        })}
      </div>
      {p.label ? <div style={{ position: "absolute", left: 40, top: 36, padding: "8px 20px", borderRadius: 12, background: "rgba(31,45,61,0.8)", color: COLORS.white, fontFamily: FONT, fontSize: 34, fontWeight: 800 }}>{p.label}</div> : null}
      {p.lines.map((l, i) => (
        <Sequence key={i} from={l.start} name={l.name}>
          <Line l={l} />
        </Sequence>
      ))}
      <div style={{ position: "absolute", right: 30, bottom: 14, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{p.credit}</div>
    </AbsoluteFill>
  );
};

export const calcOpeningMetadata: CalculateMetadataFunction<OpeningProps> = ({ props }) => ({ durationInFrames: Math.max(30, props.total) });
