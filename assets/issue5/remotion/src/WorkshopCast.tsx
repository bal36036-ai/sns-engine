import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import type { PCLine, PCMember } from "./PuppetCast";
import { PuppetDog, Rig } from "./PuppetDog";
import { WorkshopBg } from "./WorkshopBg";
import { COLORS, FONT } from "./theme";

// 加工場の背景（AIで描いた絵＋カメラの動き・光・ほこり）に、4匹を立たせた会話劇。
// 背景とキャラは場面の外に置き、場面が変わってもカメラ・揺れ・まばたきが途切れないようにする。吹き出しと声だけ場面ごと。
export type WorkshopCastProps = { cast: Record<string, PCMember>; rigs: Record<string, Rig>; lines: PCLine[]; bg: string; bgm: string; bgmVolume: number; credit: string };

const FEET_Y = 1015;

const Bubble: React.FC<{ text: string; name: string; color: string; tailX: number }> = ({ text, name, color, tailX }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 9], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const left = 70;
  const tail = Math.max(left + 60, Math.min(1010 - 60, tailX)) - left - 26;
  return (
    <div style={{ position: "absolute", left, right: 70, top: 60, scale: `${s}`, opacity: interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" }), filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.28))" }}>
      <div style={{ display: "inline-block", marginLeft: 24, padding: "6px 22px", borderRadius: "16px 16px 0 0", background: color, color: COLORS.white, fontFamily: FONT, fontSize: 34, fontWeight: 900 }}>{name}</div>
      <div style={{ position: "relative", padding: "22px 34px", background: "rgba(255,255,255,0.96)", border: `5px solid ${color}`, borderRadius: 30, fontFamily: FONT, fontSize: 52, fontWeight: 900, lineHeight: 1.35, color: COLORS.navy, textAlign: "center", whiteSpace: "pre-line" }}>
        {text}
        <div style={{ position: "absolute", left: tail, bottom: -34, width: 0, height: 0, borderLeft: "24px solid transparent", borderRight: "24px solid transparent", borderTop: `34px solid ${color}` }} />
      </div>
    </div>
  );
};

const Line: React.FC<{ line: PCLine; p: WorkshopCastProps }> = ({ line, p }) => {
  const c = p.cast[line.speaker];
  return (
    <AbsoluteFill>
      <Bubble text={line.text} name={c.name} color={c.color} tailX={c.x} />
      <Audio src={staticFile(`audio/${line.voice}`)} from={line.lead} volume={1} />
    </AbsoluteFill>
  );
};

// 全員の絵：今の場面を探し、話す人だけ口とうなずきを動かす
const Actors: React.FC<{ p: WorkshopCastProps; starts: number[] }> = ({ p, starts }) => {
  const frame = useCurrentFrame();
  let k = starts.findIndex((s, i) => frame >= s && frame < s + p.lines[i].frames);
  if (k < 0) k = p.lines.length - 1;
  const line = p.lines[k];
  const local = frame - starts[k];
  const m = local < line.lead ? 0 : (line.mouth[Math.min(line.mouth.length - 1, local - line.lead)] ?? 0);
  const talking = local >= line.lead && local < line.lead + line.mouth.length;
  return (
    <>
      {Object.entries(p.cast).map(([id, c], n) => {
        const speaking = id === line.speaker;
        const prev = k > 0 ? (p.lines[k - 1].tilt?.[id] ?? 0) : 0;
        const tilt = interpolate(local, [0, 14], [prev, line.tilt?.[id] ?? 0], { extrapolateRight: "clamp" });
        // 話す人は少し前へ（大きく）、ほかは少し下がる
        const grow = interpolate(local, [0, 10], [1, speaking ? 1.04 : 0.99], { extrapolateRight: "clamp" });
        return (
          <div key={id} style={{ position: "absolute", inset: 0, transformOrigin: `${c.x}px ${FEET_Y}px`, scale: `${grow}` }}>
            <div style={{ position: "absolute", left: c.x - 115, top: FEET_Y - 14, width: 230, height: 30, borderRadius: "50%", background: "rgba(25,18,10,0.35)", filter: "blur(6px)" }} />
            <PuppetDog rig={p.rigs[line.poses[id]]} height={c.height} x={c.x} feetY={FEET_Y} mouth={speaking ? m : 0} talking={speaking && talking} tilt={tilt} seed={n * 5} offset={0} />
          </div>
        );
      })}
    </>
  );
};

export const WorkshopCast: React.FC<WorkshopCastProps> = (p) => {
  const starts: number[] = [];
  let acc = 0;
  for (const l of p.lines) { starts.push(acc); acc += l.frames; }
  const total = acc;
  return (
    <AbsoluteFill style={{ background: "#2B2620" }}>
      <WorkshopBg src={p.bg} />
      <Actors p={p} starts={starts} />
      <Audio src={staticFile(`audio/${p.bgm}`)} volume={(f) => p.bgmVolume * interpolate(f, [total - 30, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Series>
        {p.lines.map((l, i) => (
          <Series.Sequence key={i} name={`${i + 1} ${p.cast[l.speaker].name}`} durationInFrames={l.frames}>
            <Line line={l} p={p} />
          </Series.Sequence>
        ))}
      </Series>
      <div style={{ position: "absolute", right: 36, bottom: 18, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{p.credit}</div>
    </AbsoluteFill>
  );
};

export const calcWorkshopCastMetadata: CalculateMetadataFunction<WorkshopCastProps> = ({ props }) => ({
  durationInFrames: Math.max(30, props.lines.reduce((a, l) => a + l.frames, 0)),
});
