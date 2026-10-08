import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { PuppetDog, Rig } from "./PuppetDog";
import { WorkshopBg } from "./WorkshopBg";
import { COLORS, FONT } from "./theme";

// 加工場で「作業している → 仲間が歩いてくる → 話す」を、時間の流れ（トラック）で動かす。
// cycle：コマ（public/chara/...）をパラパラ漫画のように切り替える（作業・歩き）。x0→x1 で移動もできる。
// rig：PuppetDog（口パク・まばたき・うなずき）。話す人は lines の speaker。
export type Track =
  | { kind: "cycle"; start: number; end: number; files: string[]; fps: number; x0?: number; x1?: number; height: number; bob?: number }
  | { kind: "rig"; start: number; end: number; rig: string; height: number; x?: number; tilt?: number };
export type Actor = { name: string; color: string; x: number; tracks: Track[] };
export type WLine = { start: number; speaker: string; text: string; voice: string; lead: number; mouth: number[]; frames: number };
export type WorkSceneProps = { actors: Record<string, Actor>; rigs: Record<string, Rig>; sizes: Record<string, [number, number]>; lines: WLine[]; bg: string; bgm: string; bgmVolume: number; credit: string; total: number };

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

const ActorView: React.FC<{ id: string; a: Actor; p: WorkSceneProps; seed: number }> = ({ id, a, p, seed }) => {
  const frame = useCurrentFrame();
  const tr = a.tracks.find((t) => frame >= t.start && frame < t.end);
  if (!tr) return null;
  const line = p.lines.find((l) => frame >= l.start && frame < l.start + l.frames);
  const local = line ? frame - line.start : 0;
  const speaking = line?.speaker === id;
  const m = speaking && line && local >= line.lead ? (line.mouth[Math.min(line.mouth.length - 1, local - line.lead)] ?? 0) : 0;
  const talking = !!(speaking && line && local >= line.lead && local < line.lead + line.mouth.length);
  // 切り替わりの瞬間を少し重ねる（パッと変わらないように）
  const fadeIn = interpolate(frame, [tr.start, tr.start + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (tr.kind === "cycle") {
    const t = frame - tr.start;
    const i = Math.floor((t * tr.fps) / 30) % tr.files.length;
    const file = tr.files[i];
    const [w, h] = p.sizes[file];
    const width = (w * tr.height) / h;
    const x = tr.x0 !== undefined && tr.x1 !== undefined ? interpolate(frame, [tr.start, tr.end], [tr.x0, tr.x1], { extrapolateRight: "clamp" }) : a.x;
    const bob = tr.bob ? -Math.abs(Math.sin((t * Math.PI * tr.fps) / 60)) * tr.bob : 0;
    return (
      <div style={{ opacity: fadeIn }}>
        <div style={{ position: "absolute", left: x - 115, top: FEET_Y - 14, width: 230, height: 30, borderRadius: "50%", background: "rgba(25,18,10,0.35)", filter: "blur(6px)" }} />
        <Img src={staticFile(`chara/${file}`)} style={{ position: "absolute", left: x - width / 2, top: FEET_Y - tr.height + bob, width, height: tr.height }} />
      </div>
    );
  }
  const x = tr.x ?? a.x;
  return (
    <div style={{ opacity: fadeIn }}>
      <div style={{ position: "absolute", left: x - 115, top: FEET_Y - 14, width: 230, height: 30, borderRadius: "50%", background: "rgba(25,18,10,0.35)", filter: "blur(6px)" }} />
      <PuppetDog rig={p.rigs[tr.rig]} height={tr.height} x={x} feetY={FEET_Y} mouth={m} talking={talking} tilt={interpolate(frame, [tr.start, tr.start + 14], [0, tr.tilt ?? 0], { extrapolateRight: "clamp" })} seed={seed} offset={0} />
    </div>
  );
};

export const WorkScene: React.FC<WorkSceneProps> = (p) => (
  <AbsoluteFill style={{ background: "#2B2620" }}>
    <WorkshopBg src={p.bg} />
    {Object.entries(p.actors).map(([id, a], n) => (
      <ActorView key={id} id={id} a={a} p={p} seed={n * 5} />
    ))}
    <Audio src={staticFile(`audio/${p.bgm}`)} volume={(f) => p.bgmVolume * interpolate(f, [p.total - 30, p.total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    {p.lines.map((l, i) => (
      <Sequence key={i} from={l.start} durationInFrames={l.frames} name={`${i + 1} ${p.actors[l.speaker].name}`}>
        <Bubble text={l.text} name={p.actors[l.speaker].name} color={p.actors[l.speaker].color} tailX={p.actors[l.speaker].x} />
        <Audio src={staticFile(`audio/${l.voice}`)} from={l.lead} volume={1} />
      </Sequence>
    ))}
    <div style={{ position: "absolute", right: 36, bottom: 18, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{p.credit}</div>
  </AbsoluteFill>
);

export const calcWorkSceneMetadata: CalculateMetadataFunction<WorkSceneProps> = ({ props }) => ({ durationInFrames: Math.max(30, props.total) });
