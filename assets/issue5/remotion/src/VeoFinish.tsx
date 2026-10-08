import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { COLORS, FONT } from "./theme";

// Google Veo で作った映像（ばるが生成）を、縦長（1080×1920）の投稿用に仕上げる：
// 上に見出し、真ん中に映像（終わったあとは最後のコマで止めてゆっくり寄る）、下に話す人の吹き出し、VOICEVOX の声、BGM、AI表示。
export type VLine = { start: number; name: string; color: string; text: string; voice: string; lead: number; frames: number };
export type VeoFinishProps = { clip: string; last: string; clipFrames: number; total: number; title: string; lines: VLine[]; bgm: string; bgmVolume: number; clipVolume: number; credit: string; clipAudio?: string; clipAudioVolume?: number };

const VW = 1080;
const VH = 810; // 横長の映像の左右を少し切って、4:3で大きく見せる
const VTOP = 400;

const Bubble: React.FC<{ line: VLine }> = ({ line }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 9], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: VTOP + VH + 60, scale: `${s}`, opacity: interpolate(f, [0, 5], [0, 1], { extrapolateRight: "clamp" }) }}>
      <div style={{ display: "inline-block", marginLeft: 24, padding: "8px 26px", borderRadius: "18px 18px 0 0", background: line.color, color: COLORS.white, fontFamily: FONT, fontSize: 40, fontWeight: 900 }}>{line.name}</div>
      <div style={{ padding: "30px 40px", background: COLORS.white, border: `6px solid ${line.color}`, borderRadius: 34, fontFamily: FONT, fontSize: 62, fontWeight: 900, lineHeight: 1.35, color: COLORS.navy, textAlign: "center", whiteSpace: "pre-line" }}>{line.text}</div>
    </div>
  );
};

export const VeoFinish: React.FC<VeoFinishProps> = (p) => {
  const f = useCurrentFrame();
  const after = f >= p.clipFrames;
  const zoom = after ? interpolate(f, [p.clipFrames, p.total], [1, 1.08], { extrapolateRight: "clamp" }) : 1;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#2A2118, #3B2E21 40%, #2A2118)" }}>
      {/* 見出し */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 110, fontFamily: FONT, color: COLORS.white, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "6px 22px", borderRadius: 999, background: COLORS.orange, fontSize: 38, fontWeight: 900 }}>現場あるある</div>
        <div style={{ marginTop: 18, fontSize: 60, fontWeight: 900, lineHeight: 1.25, whiteSpace: "pre-line" }}>{p.title}</div>
      </div>
      {/* 映像 */}
      <div style={{ position: "absolute", left: 0, top: VTOP, width: VW, height: VH, overflow: "hidden", boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
        {!after ? (
          <Video src={staticFile(p.clip)} volume={p.clipVolume} style={{ width: VW, height: VH, objectFit: "cover" }} />
        ) : (
          <Img src={staticFile(p.last)} style={{ width: VW, height: VH, objectFit: "cover", scale: `${zoom}` }} />
        )}
      </div>
      {p.lines.map((l, i) => (
        <Sequence key={i} from={l.start} durationInFrames={l.frames} name={`${i + 1} ${l.name}`}>
          <Bubble line={l} />
          {l.voice ? <Audio src={staticFile(`audio/${l.voice}`)} from={l.lead} volume={1} /> : null}
        </Sequence>
      ))}
      {/* 別に作ったVeoの映像の声だけを重ねる（映像は文字なしの方を使う） */}
      {p.clipAudio ? <Audio src={staticFile(p.clipAudio)} volume={p.clipAudioVolume ?? 1} /> : null}
      <Audio src={staticFile(`audio/${p.bgm}`)} volume={(fr) => p.bgmVolume * interpolate(fr, [p.total - 30, p.total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 90, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.78)", textAlign: "center", lineHeight: 1.5, whiteSpace: "pre-line" }}>{p.credit}</div>
    </AbsoluteFill>
  );
};

export const calcVeoMetadata: CalculateMetadataFunction<VeoFinishProps> = ({ props }) => ({ durationInFrames: Math.max(30, props.total) });
