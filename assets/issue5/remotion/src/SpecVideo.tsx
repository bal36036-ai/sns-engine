import { Audio } from "@remotion/media";
import { Easing, Img, Interactive, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { Caption } from "./Caption";
import { Headline } from "./Headline";
import { SceneFrame } from "./SceneFrame";
import { Mark } from "./Screen";
import { PuppetDog, Rig } from "./PuppetDog";
import { COLORS, FONT } from "./theme";

// 台本のデータ（props/*.json。tools/make_spec_video.py が作る）から、実画面＋声＋字幕の動画を組み立てる。
export type SpecMark = { x: number; y: number; w: number; h: number; at: number };
export type SpecItem = {
  dir: "screens" | "screens-h";
  file: string;
  srcW: number;
  srcH: number;
  crop?: { x: number; y: number; w: number; h: number }; // 画像の一部だけを見せる（0〜1の割合）
  left: number;
  top: number;
  width: number; // 見せる幅（px）。高さは切り抜きの縦横比から決まる
  appear: number;
  hide?: number;
  label?: string;
  marks?: SpecMark[];
};
export type SpecScene = {
  headline: string;
  note: string[]; // 見出しの下の小さな説明（最後の行は強調色にできる）
  noteTop: number;
  noteAccentLast?: boolean;
  caption: string;
  captionDelay: number;
  frames: number;
  lead: number; // 声が始まるまでのフレーム
  voice: string; // public/audio 以下のファイル
  items: SpecItem[];
  pose?: string; // 案内役の絵（guide.rigs のキー）
  mouth?: number[]; // 案内役の口の開き（声の大きさ、1フレームごと）
};
// 案内役のキャラクター（右下に立って、口パクしながら説明する）。無ければ今までどおり画面と字幕だけ
export type SpecGuide = { x: number; feetY: number; height: number; captionRight: number; rigs: Record<string, Rig> };
export type SpecProps = { scenes: SpecScene[]; bgm: string; bgmVolume: number; guide?: SpecGuide };

const itemHeight = (it: SpecItem) => {
  const c = it.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  return Math.round((c.h * it.srcH * it.width) / (c.w * it.srcW));
};

const Item: React.FC<{ it: SpecItem; index: number }> = ({ it, index }) => {
  const frame = useCurrentFrame();
  const c = it.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const scale = it.width / (c.w * it.srcW);
  const h = itemHeight(it);
  const fadeOut = it.hide === undefined ? 1 : interpolate(frame, [it.hide, it.hide + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [it.appear, it.appear + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * fadeOut;
  const rise = interpolate(frame, [it.appear, it.appear + 16], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <>
      {it.label ? (
        <div style={{ position: "absolute", left: it.left, top: it.top - 50, width: it.width, fontSize: 38, fontWeight: 900, color: COLORS.navy, opacity, translate: `0px ${rise}px` }}>{it.label}</div>
      ) : null}
      <Interactive.Div
        name={`Screen ${index + 1}`}
        style={{
          position: "absolute",
          left: it.left,
          top: it.top,
          width: it.width,
          height: h,
          overflow: "hidden",
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(31,45,61,0.18)",
          border: `2px solid ${COLORS.line}`,
          background: COLORS.white,
          opacity,
          translate: `0px ${rise}px`,
        }}
      >
        <Img src={staticFile(`${it.dir}/${it.file}`)} style={{ position: "absolute", left: -c.x * it.srcW * scale, top: -c.y * it.srcH * scale, width: it.srcW * scale, height: it.srcH * scale, display: "block" }} />
        {(it.marks ?? []).map((m, i) => (
          <Mark key={i} x={m.x} y={m.y} w={m.w} h={m.h} at={m.at} width={it.width} height={h} />
        ))}
      </Interactive.Div>
    </>
  );
};

const Guide: React.FC<{ g: SpecGuide; scene: SpecScene; offset: number }> = ({ g, scene, offset }) => {
  const frame = useCurrentFrame();
  const local = frame - scene.lead;
  const mouth = scene.mouth ?? [];
  const m = local >= 0 && local < mouth.length ? mouth[local] : 0;
  const rig = g.rigs[scene.pose ?? Object.keys(g.rigs)[0]];
  return (
    <>
      <div style={{ position: "absolute", left: g.x - 110, top: g.feetY - 14, width: 220, height: 26, borderRadius: "50%", background: "rgba(31,45,61,0.22)", filter: "blur(6px)" }} />
      <PuppetDog rig={rig} height={g.height} x={g.x} feetY={g.feetY} mouth={m} talking={local >= 0 && local < mouth.length} offset={offset} />
    </>
  );
};

const Scene: React.FC<{ scene: SpecScene; guide?: SpecGuide; offset: number }> = ({ scene, guide, offset }) => (
  <SceneFrame>
    <Headline lines={[scene.headline]} size={84} />
    <div style={{ position: "absolute", left: 80, right: 80, top: scene.noteTop, fontFamily: FONT, fontSize: 34, fontWeight: 700, lineHeight: 1.3, color: COLORS.muted }}>
      {scene.note.map((line, i) => (
        <div key={i} style={scene.noteAccentLast && i === scene.note.length - 1 ? { color: COLORS.orange, fontWeight: 900 } : undefined}>
          {line}
        </div>
      ))}
    </div>
    {scene.items.map((it, i) => (
      <Item key={i} it={it} index={i} />
    ))}
    {guide ? <Guide g={guide} scene={scene} offset={offset} /> : null}
    <Caption text={scene.caption} delay={scene.captionDelay} right={guide?.captionRight} />
    <Audio src={staticFile(`audio/${scene.voice}`)} from={scene.lead} volume={1} />
  </SceneFrame>
);

export const SpecVideo: React.FC<SpecProps> = ({ scenes, bgm, bgmVolume, guide }) => {
  const total = scenes.reduce((a, s) => a + s.frames, 0);
  return (
    <>
      <Audio src={staticFile(`audio/${bgm}`)} volume={(f) => bgmVolume * interpolate(f, [total - 45, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Series>
        {scenes.map((s, i) => (
          <Series.Sequence key={i} name={`Scene ${i + 1}`} durationInFrames={s.frames}>
            <Scene scene={s} guide={guide} offset={scenes.slice(0, i).reduce((a, x) => a + x.frames, 0)} />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

export const calcSpecMetadata: CalculateMetadataFunction<SpecProps> = ({ props }) => ({
  durationInFrames: props.scenes.reduce((a, s) => a + s.frames, 0),
});
