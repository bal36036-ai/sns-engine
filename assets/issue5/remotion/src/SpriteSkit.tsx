import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { Bubble, Rack } from "./DogSkit";
import { COLORS, FONT } from "./theme";

// 職人の黒シュナ（Codexの画像生成で作った絵：public/chara/*.png）を、コマの切り替えで動かす寸劇。
// sprites：その場面で出す絵（at＝出し始めるフレーム）。alt があれば、声が大きいフレームだけ alt（口を開けた絵）に切り替える。
export type SpriteCue = { file: string; at: number; alt?: string };
export type SpriteLine = {
  text: string;
  voice: string;
  frames: number;
  lead: number;
  mouth: number[];
  prop: "rack" | "measure" | "none";
  sprites: SpriteCue[];
  enter?: { file: string; frames: number };
};
export type SpriteSkitProps = { lines: SpriteLine[]; bgm: string; bgmVolume: number; credit: string; sizes: Record<string, [number, number]> };

const DOG_H = 610;
const FEET_Y = 1010;
const CX = 330;

const Line: React.FC<{ line: SpriteLine; credit: string; sizes: SpriteSkitProps["sizes"] }> = ({ line, credit, sizes }) => {
  const frame = useCurrentFrame();
  const m = frame < line.lead ? 0 : (line.mouth[Math.min(line.mouth.length - 1, frame - line.lead)] ?? 0);
  const walking = line.enter !== undefined && frame < line.enter.frames;
  let file: string;
  if (walking && line.enter) file = line.enter.file;
  else {
    const cue = [...line.sprites].reverse().find((s) => frame >= s.at) ?? line.sprites[0];
    file = cue.alt && m > 0.35 ? cue.alt : cue.file;
  }
  const [w, h] = sizes[file];
  const width = (w * DOG_H) / h;
  const x = walking && line.enter ? interpolate(frame, [0, line.enter.frames], [-420, CX], { extrapolateRight: "clamp" }) : CX;
  const step = walking ? -Math.abs(Math.sin(frame / 3)) * 18 : 0;
  const talkBob = -Math.abs(Math.sin(frame / 3.2)) * 10 * Math.min(1, m * 2);
  const breathe = Math.sin(frame / 14) * 0.008;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#F8F4EC 0 72%, #E7DCC8 72% 100%)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22, background: COLORS.orange }} />
      {line.prop !== "none" ? <Rack measure={line.prop === "measure"} /> : null}
      <div style={{ position: "absolute", left: x - 170, top: FEET_Y - 10, width: 340, height: 36, borderRadius: "50%", background: "rgba(31,45,61,0.16)", filter: "blur(4px)" }} />
      <Img
        src={staticFile(`chara/${file}`)}
        style={{ position: "absolute", left: x - width / 2, top: FEET_Y - DOG_H + step + talkBob, width, height: DOG_H, transformOrigin: "50% 100%", scale: `${1 - breathe} ${1 + breathe}` }}
      />
      <Bubble text={line.text} />
      <div style={{ position: "absolute", right: 40, bottom: 26, fontFamily: FONT, fontSize: 28, fontWeight: 700, color: COLORS.muted }}>{credit}</div>
      <Audio src={staticFile(`audio/${line.voice}`)} from={line.lead} volume={1} />
    </AbsoluteFill>
  );
};

export const SpriteSkit: React.FC<SpriteSkitProps> = ({ lines, bgm, bgmVolume, credit, sizes }) => {
  const total = lines.reduce((a, l) => a + l.frames, 0);
  return (
    <>
      <Audio src={staticFile(`audio/${bgm}`)} volume={(f) => bgmVolume * interpolate(f, [total - 30, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Series>
        {lines.map((l, i) => (
          <Series.Sequence key={i} name={`Line ${i + 1}`} durationInFrames={l.frames}>
            <Line line={l} credit={credit} sizes={sizes} />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

export const calcSpriteMetadata: CalculateMetadataFunction<SpriteSkitProps> = ({ props }) => ({
  durationInFrames: Math.max(30, props.lines.reduce((a, l) => a + l.frames, 0)),
});
