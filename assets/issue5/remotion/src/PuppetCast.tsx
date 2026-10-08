import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { Bubble, Stage } from "./CastSkit";
import { PuppetDog, Rig } from "./PuppetDog";
import { COLORS, FONT } from "./theme";

// 現場の仲間の会話劇（自然な動き版）。全員を PuppetDog（頭と体を分けて動かし、口と目は差分を重ねる）で描く。
// 話す人だけ口パク・うなずき。聞いている人も、まばたきと呼吸で動く。台本は tools/make_puppet_cast.py。
export type PCMember = { name: string; x: number; height: number; color: string };
export type PCLine = { speaker: string; text: string; voice: string; frames: number; lead: number; mouth: number[]; poses: Record<string, string>; tilt?: Record<string, number> };
export type PuppetCastProps = { cast: Record<string, PCMember>; rigs: Record<string, Rig>; lines: PCLine[]; bgm: string; bgmVolume: number; credit: string };

const FEET_Y = 1000;

const Scene: React.FC<{ line: PCLine; p: PuppetCastProps; index: number }> = ({ line, p, index }) => {
  const frame = useCurrentFrame();
  const m = frame < line.lead ? 0 : (line.mouth[Math.min(line.mouth.length - 1, frame - line.lead)] ?? 0);
  const talking = frame >= line.lead && frame < line.lead + line.mouth.length;
  return (
    <AbsoluteFill>
      <Stage />
      {Object.entries(p.cast).map(([id, c], k) => {
        const speaking = id === line.speaker;
        const target = line.tilt?.[id] ?? 0;
        const tilt = interpolate(frame, [0, 14], [0, target], { extrapolateRight: "clamp" });
        return (
          <div key={id}>
            <div style={{ position: "absolute", left: c.x - 120, top: FEET_Y - 12, width: 240, height: 30, borderRadius: "50%", background: "rgba(31,45,61,0.15)", filter: "blur(4px)" }} />
            <PuppetDog rig={p.rigs[line.poses[id]]} height={c.height} x={c.x} feetY={FEET_Y} mouth={speaking ? m : 0} talking={speaking && talking} tilt={tilt} seed={k * 5 + index} />
          </div>
        );
      })}
      <Bubble text={line.text} name={p.cast[line.speaker].name} color={p.cast[line.speaker].color} tailX={p.cast[line.speaker].x} />
      <div style={{ position: "absolute", right: 40, bottom: 22, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: COLORS.muted }}>{p.credit}</div>
      <Audio src={staticFile(`audio/${line.voice}`)} from={line.lead} volume={1} />
    </AbsoluteFill>
  );
};

export const PuppetCast: React.FC<PuppetCastProps> = (p) => {
  const total = p.lines.reduce((a, l) => a + l.frames, 0);
  return (
    <>
      <Audio src={staticFile(`audio/${p.bgm}`)} volume={(f) => p.bgmVolume * interpolate(f, [total - 30, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Series>
        {p.lines.map((l, i) => (
          <Series.Sequence key={i} name={`${i + 1} ${p.cast[l.speaker].name}`} durationInFrames={l.frames}>
            <Scene line={l} p={p} index={i} />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

export const calcPuppetCastMetadata: CalculateMetadataFunction<PuppetCastProps> = ({ props }) => ({
  durationInFrames: Math.max(30, props.lines.reduce((a, l) => a + l.frames, 0)),
});
