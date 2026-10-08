import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { COLORS, FONT } from "./theme";

// 現場の仲間が何人も出てくる会話劇。絵は public/chara/（Codexの画像生成で作った透過PNG）。
// 台本・声・口の動きは tools/make_cast_skit.py が props/cast-*.json に書く。
export type CastMember = { name: string; x: number; height: number; color: string };
export type CastLine = {
  speaker: string;
  text: string;
  voice: string;
  frames: number;
  lead: number;
  mouth: number[];
  poses: Record<string, string>; // キャラごとの絵（この場面の間）
  alt?: string; // 話す人：声が大きいフレームだけこの絵にする
};
export type CastSkitProps = {
  cast: Record<string, CastMember>;
  lines: CastLine[];
  sizes: Record<string, [number, number]>;
  bgm: string;
  bgmVolume: number;
  credit: string;
  title?: string;
};

const FEET_Y = 1000;

const Stage: React.FC = () => (
  <>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#F3EEE4 0 70%, #E2D6C0 70% 100%)" }} />
    {/* 奥の鉄骨と端材の棚（説明用の絵。寸法は書かない） */}
    <div style={{ position: "absolute", left: 60, top: 300, width: 960, height: 26, background: "#A3ACB5", borderRadius: 4 }} />
    {[90, 520, 950].map((x) => (
      <div key={x} style={{ position: "absolute", left: x, top: 300, width: 30, height: 460, background: "#A3ACB5", borderRadius: 4 }} />
    ))}
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{ position: "absolute", left: 600 + (i % 2) * 40, top: 420 + i * 60, width: 300 - i * 40, height: 26, borderRadius: 4, background: "linear-gradient(#CBD2D8,#97A1AA)", opacity: 0.9 }} />
    ))}
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22, background: COLORS.orange }} />
  </>
);

const Bubble: React.FC<{ text: string; name: string; color: string; tailX: number }> = ({ text, name, color, tailX }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 10], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const left = 70;
  const tail = Math.max(left + 60, Math.min(1010 - 60, tailX)) - left - 26;
  return (
    <div style={{ position: "absolute", left, right: 70, top: 70, scale: `${s}`, opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) }}>
      <div style={{ display: "inline-block", marginLeft: 24, padding: "6px 22px", borderRadius: "16px 16px 0 0", background: color, color: COLORS.white, fontFamily: FONT, fontSize: 34, fontWeight: 900 }}>{name}</div>
      <div style={{ position: "relative", padding: "24px 36px", background: COLORS.white, border: `5px solid ${color}`, borderRadius: 30, fontFamily: FONT, fontSize: 54, fontWeight: 900, lineHeight: 1.35, color: COLORS.navy, textAlign: "center", whiteSpace: "pre-line" }}>
        {text}
        <div style={{ position: "absolute", left: tail, bottom: -36, width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderTop: `36px solid ${color}` }} />
      </div>
    </div>
  );
};

const Scene: React.FC<{ line: CastLine; props: CastSkitProps }> = ({ line, props }) => {
  const frame = useCurrentFrame();
  const m = frame < line.lead ? 0 : (line.mouth[Math.min(line.mouth.length - 1, frame - line.lead)] ?? 0);
  const ids = Object.keys(props.cast);
  return (
    <AbsoluteFill>
      <Stage />
      {ids.map((id) => {
        const c = props.cast[id];
        const speaking = id === line.speaker;
        const file = speaking && line.alt && m > 0.35 ? line.alt : line.poses[id];
        const [w, h] = props.sizes[file];
        const width = (w * c.height) / h;
        const bob = speaking ? -Math.abs(Math.sin(frame / 3.2)) * 10 * Math.min(1, m * 2) : 0;
        const breathe = Math.sin(frame / 14 + c.x) * 0.008;
        return (
          <div key={id}>
            <div style={{ position: "absolute", left: c.x - 120, top: FEET_Y - 12, width: 240, height: 30, borderRadius: "50%", background: "rgba(31,45,61,0.15)", filter: "blur(4px)" }} />
            <Img
              src={staticFile(`chara/${file}`)}
              style={{ position: "absolute", left: c.x - width / 2, top: FEET_Y - c.height + bob, width, height: c.height, transformOrigin: "50% 100%", scale: `${1 - breathe} ${1 + breathe}`, filter: speaking ? "none" : "saturate(0.9) brightness(0.97)" }}
            />
          </div>
        );
      })}
      <Bubble text={line.text} name={props.cast[line.speaker].name} color={props.cast[line.speaker].color} tailX={props.cast[line.speaker].x} />
      <div style={{ position: "absolute", right: 40, bottom: 22, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: COLORS.muted }}>{props.credit}</div>
      <Audio src={staticFile(`audio/${line.voice}`)} from={line.lead} volume={1} />
    </AbsoluteFill>
  );
};

export const CastSkit: React.FC<CastSkitProps> = (props) => {
  const total = props.lines.reduce((a, l) => a + l.frames, 0);
  return (
    <>
      <Audio src={staticFile(`audio/${props.bgm}`)} volume={(f) => props.bgmVolume * interpolate(f, [total - 30, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Series>
        {props.lines.map((l, i) => (
          <Series.Sequence key={i} name={`${i + 1} ${props.cast[l.speaker].name}`} durationInFrames={l.frames}>
            <Scene line={l} props={props} />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

export const calcCastMetadata: CalculateMetadataFunction<CastSkitProps> = ({ props }) => ({
  durationInFrames: Math.max(30, props.lines.reduce((a, l) => a + l.frames, 0)),
});
