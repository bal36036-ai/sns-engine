import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { DogPose, DogWorker } from "./DogWorker";
import { COLORS, FONT } from "./theme";

// 職人ワンちゃんの「あるある」寸劇。台本・声・口の動きは tools/make_dog_skit.py が props/dog-*.json に書く。
export type DogLine = { text: string; voice: string; frames: number; lead: number; mouth: number[]; pose: DogPose; prop: "rack" | "measure" | "none" };
export type DogSkitProps = { lines: DogLine[]; bgm: string; bgmVolume: number; credit: string };

// 端材の棚（説明用の絵。寸法は書かない）
export const Rack: React.FC<{ measure: boolean }> = ({ measure }) => {
  const frame = useCurrentFrame();
  const bars = [270, 190, 250, 140, 220, 170];
  const tape = interpolate(frame, [8, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <div style={{ position: "absolute", left: 640, top: 470, width: 380, height: 470 }}>
      <div style={{ position: "absolute", left: 10, top: 0, width: 16, height: 470, background: "#8A9097", borderRadius: 4 }} />
      <div style={{ position: "absolute", right: 10, top: 0, width: 16, height: 470, background: "#8A9097", borderRadius: 4 }} />
      {bars.map((w, i) => (
        <div key={i}>
          <div style={{ position: "absolute", left: 40, top: 30 + i * 70, width: w, height: 34, borderRadius: 4, background: "linear-gradient(#B8C0C8,#8E979F)", border: "2px solid #6E777F" }} />
          <div style={{ position: "absolute", left: 50 + w, top: 32 + i * 70, fontSize: 30, fontWeight: 900, color: COLORS.orange, fontFamily: FONT }}>？</div>
        </div>
      ))}
      {measure ? (
        <div style={{ position: "absolute", left: 40, top: 6, height: 20, width: 270 * tape, background: "repeating-linear-gradient(90deg,#F3C433 0 18px,#E0AE1C 18px 20px)", borderRadius: 3, border: "2px solid #B48A10" }} />
      ) : null}
    </div>
  );
};

export const Bubble: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 10], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 90, padding: "30px 40px", background: COLORS.white, border: `5px solid ${COLORS.navy}`, borderRadius: 36, fontFamily: FONT, fontSize: 60, fontWeight: 900, lineHeight: 1.35, color: COLORS.navy, textAlign: "center", whiteSpace: "pre-line", scale: `${s}`, opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) }}>
      {text}
      <div style={{ position: "absolute", left: 220, bottom: -38, width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderTop: `38px solid ${COLORS.navy}` }} />
    </div>
  );
};

const Line: React.FC<{ line: DogLine; credit: string }> = ({ line, credit }) => {
  const frame = useCurrentFrame();
  const m = line.mouth[Math.max(0, Math.min(line.mouth.length - 1, frame - line.lead))] ?? 0;
  const mouth = frame < line.lead ? 0 : m;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#F8F4EC 0 72%, #E7DCC8 72% 100%)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22, background: COLORS.orange }} />
      {line.prop !== "none" ? <Rack measure={line.prop === "measure"} /> : null}
      <DogWorker mouth={mouth} pose={line.pose} x={60} y={330} scale={0.95} />
      <Bubble text={line.text} />
      <div style={{ position: "absolute", right: 40, bottom: 26, fontFamily: FONT, fontSize: 28, fontWeight: 700, color: COLORS.muted }}>{credit}</div>
      <Audio src={staticFile(`audio/${line.voice}`)} from={line.lead} volume={1} />
    </AbsoluteFill>
  );
};

export const DogSkit: React.FC<DogSkitProps> = ({ lines, bgm, bgmVolume, credit }) => {
  const total = lines.reduce((a, l) => a + l.frames, 0);
  return (
    <>
      <Audio src={staticFile(`audio/${bgm}`)} volume={(f) => bgmVolume * interpolate(f, [total - 30, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Series>
        {lines.map((l, i) => (
          <Series.Sequence key={i} name={`Line ${i + 1}`} durationInFrames={l.frames}>
            <Line line={l} credit={credit} />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

export const calcDogMetadata: CalculateMetadataFunction<DogSkitProps> = ({ props }) => ({
  durationInFrames: Math.max(30, props.lines.reduce((a, l) => a + l.frames, 0)),
});
