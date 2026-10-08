import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { Bubble, Rack } from "./DogSkit";
import { PuppetDog, Rig } from "./PuppetDog";
import { COLORS, FONT } from "./theme";

// 自然な動きの試作：1枚の絵を頭と体に分け、口と目の差分を重ねて、口パク・まばたき・うなずき・首かしげ・呼吸を付ける。
export type PuppetLine = { text: string; voice: string; frames: number; lead: number; mouth: number[]; tilt: number };
export type PuppetDemoProps = { rig: Rig; lines: PuppetLine[]; bgm: string; bgmVolume: number; credit: string };

const Line: React.FC<{ line: PuppetLine; rig: Rig; credit: string; index: number }> = ({ line, rig, credit, index }) => {
  const frame = useCurrentFrame();
  const m = frame < line.lead ? 0 : (line.mouth[Math.min(line.mouth.length - 1, frame - line.lead)] ?? 0);
  const talking = frame >= line.lead && frame < line.lead + line.mouth.length;
  const tilt = interpolate(frame, [0, 14], [0, line.tilt], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#F8F4EC 0 72%, #E7DCC8 72% 100%)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22, background: COLORS.orange }} />
      <Rack measure={false} />
      <div style={{ position: "absolute", left: 160, top: 990, width: 340, height: 36, borderRadius: "50%", background: "rgba(31,45,61,0.16)", filter: "blur(4px)" }} />
      <PuppetDog rig={rig} height={640} x={330} feetY={1010} mouth={m} talking={talking} tilt={tilt} seed={index} />
      <Bubble text={line.text} />
      <div style={{ position: "absolute", right: 40, bottom: 26, fontFamily: FONT, fontSize: 28, fontWeight: 700, color: COLORS.muted }}>{credit}</div>
      <Audio src={staticFile(`audio/${line.voice}`)} from={line.lead} volume={1} />
    </AbsoluteFill>
  );
};

export const PuppetDemo: React.FC<PuppetDemoProps> = ({ rig, lines, bgm, bgmVolume, credit }) => {
  const total = lines.reduce((a, l) => a + l.frames, 0);
  return (
    <>
      <Audio src={staticFile(`audio/${bgm}`)} volume={(f) => bgmVolume * interpolate(f, [total - 30, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Series>
        {lines.map((l, i) => (
          <Series.Sequence key={i} durationInFrames={l.frames}>
            <Line line={l} rig={rig} credit={credit} index={i} />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

export const calcPuppetMetadata: CalculateMetadataFunction<PuppetDemoProps> = ({ props }) => ({
  durationInFrames: Math.max(30, props.lines.reduce((a, l) => a + l.frames, 0)),
});
