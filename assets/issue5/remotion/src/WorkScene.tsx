import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { PuppetDog, Rig } from "./PuppetDog";
import { WorkshopBg } from "./WorkshopBg";
import { Mark } from "./Screen";
import { COLORS, FONT } from "./theme";

// 加工場で「作業している → 仲間が歩いてくる → 話す」を、時間の流れ（トラック）で動かす。
// cycle：コマ（public/chara/...）をパラパラ漫画のように切り替える（作業・歩き）。x0→x1 で移動もできる。
// rig：PuppetDog（口パク・まばたき・うなずき）。話す人は lines の speaker。
export type Track =
  | { kind: "cycle"; start: number; end: number; files: string[]; fps: number; x0?: number; x1?: number; height: number; bob?: number }
  | { kind: "rig"; start: number; end: number; rig: string; height: number; x?: number; tilt?: number };
export type Actor = { name: string; color: string; x: number; tracks: Track[] };
export type WLine = { start: number; speaker: string; text: string; voice: string; lead: number; mouth: number[]; frames: number };
// アプリの画面を、タブレット風の枠で大きく見せる（会話の途中で）。items は上から順に並べる。marks の at は枠が出てからのフレーム
export type InsertItem = { dir: string; file: string; srcW: number; srcH: number; crop?: { x: number; y: number; w: number; h: number }; width: number; marks?: { x: number; y: number; w: number; h: number; at: number }[] };
export type Insert = { start: number; end: number; note: string; foot: string; items: InsertItem[] };
// 連載用：カメラの寄り引き（cuts）、冒頭の大見出し（hook）、右上の話数（badge）、最後の「つづく」予告（next）。どれも省略できる（これまでの動画は変わらない）。
export type Cut = { start: number; end: number; z0: number; z1: number; ox: number; oy: number };
export type WorkSceneProps = {
  actors: Record<string, Actor>;
  rigs: Record<string, Rig>;
  sizes: Record<string, [number, number]>;
  lines: WLine[];
  bg: string;
  bgm: string;
  bgmVolume: number;
  credit: string;
  total: number;
  inserts?: Insert[];
  cuts?: Cut[];
  hook?: { text: string; frames: number };
  badge?: string;
  next?: { text: string; frames: number };
  depth?: { cam: CamKey[]; actorZ: Record<string, number> };
};
// 2.5D のカメラの通り道（f：フレーム、x：横移動 px、z：前へ進む px、yaw：左右の向き 度）
export type CamKey = { f: number; x: number; z: number; yaw: number };

const Camera: React.FC<{ cuts?: Cut[]; children: React.ReactNode }> = ({ cuts, children }) => {
  const frame = useCurrentFrame();
  const c = cuts?.find((k) => frame >= k.start && frame < k.end);
  const z = c ? interpolate(frame, [c.start, c.end], [c.z0, c.z1]) : 1;
  const punch = c ? interpolate(frame, [c.start, c.start + 5], [1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ transformOrigin: c ? `${c.ox}px ${c.oy}px` : "50% 100%", scale: `${z * punch}` }}>{children}</AbsoluteFill>;
};

const Hook: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 7], [0.7, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const fade = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 450, opacity: fade, scale: `${pop}`, textAlign: "center" }}>
      <span style={{ display: "inline-block", padding: "12px 30px", background: "#FFD23F", border: `7px solid ${COLORS.navy}`, borderRadius: 26, fontFamily: FONT, fontSize: 76, fontWeight: 900, lineHeight: 1.2, color: COLORS.navy, whiteSpace: "pre-line", boxShadow: "0 14px 30px rgba(0,0,0,0.4)" }}>{text}</span>
    </div>
  );
};

const NextCard: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 12], [40, 0], { extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const out = interpolate(frame, [frames - 6, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 690, opacity: a * out, translate: `0 ${y}px`, background: "rgba(20,16,10,0.78)", padding: "22px 50px 26px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, color: "#FFD23F" }}>つづく…</div>
      <div style={{ fontFamily: FONT, fontSize: 56, fontWeight: 900, color: COLORS.white, lineHeight: 1.25, whiteSpace: "pre-line" }}>{text}</div>
    </div>
  );
};

const InsertPanel: React.FC<{ ins: Insert }> = ({ ins }) => {
  const frame = useCurrentFrame();
  const dur = ins.end - ins.start;
  const fade = interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = interpolate(frame, [0, 12], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,10,0.45)", opacity: fade }} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 330, opacity: fade, scale: `${s}`, padding: 16, borderRadius: 34, background: COLORS.navy, boxShadow: "0 24px 50px rgba(0,0,0,0.45)" }}>
        <div style={{ borderRadius: 22, background: "#F8F4EC", padding: "16px 22px 18px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ alignSelf: "stretch", fontFamily: FONT, fontSize: 30, fontWeight: 800, color: COLORS.muted }}>{ins.note}</div>
          {ins.items.map((it, i) => {
            const c = it.crop ?? { x: 0, y: 0, w: 1, h: 1 };
            const sc = it.width / (c.w * it.srcW);
            const h = Math.round(c.h * it.srcH * sc);
            return (
              <div key={i} style={{ position: "relative", width: it.width, height: h, overflow: "hidden", borderRadius: 14, border: `2px solid ${COLORS.line}`, background: COLORS.white }}>
                <Img src={staticFile(`${it.dir}/${it.file}`)} style={{ position: "absolute", left: -c.x * it.srcW * sc, top: -c.y * it.srcH * sc, width: it.srcW * sc, height: it.srcH * sc }} />
                {(it.marks ?? []).map((m, k) => (
                  <Mark key={k} x={m.x} y={m.y} w={m.w} h={m.h} at={m.at} width={it.width} height={h} />
                ))}
              </div>
            );
          })}
          <div style={{ alignSelf: "stretch", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: COLORS.orange }}>{ins.foot}</div>
        </div>
      </div>
    </>
  );
};

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

// ---------- 2.5D（奥行き）：背景を奥、キャラを中、鉄骨と鎖を手前に置き、遠近のあるカメラで動かす ----------
const P3 = 1100; // 遠近の強さ（視点までの距離 px）
const BG_Z = -900;

const camAt = (f: number, keys: CamKey[]) => {
  if (!keys.length) return { x: 0, z: 0, yaw: 0 };
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f >= a.f && f <= b.f) {
      const t = b.f === a.f ? 1 : Easing.inOut(Easing.cubic)((f - a.f) / (b.f - a.f));
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: a.yaw + (b.yaw - a.yaw) * t };
    }
  }
  return keys[keys.length - 1];
};

const Foreground: React.FC = () => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 40) * 3;
  return (
    <>
      {/* 手前の左下：寝かせた鉄骨の束（ピントの外） */}
      <div style={{ position: "absolute", left: -260, top: 960, width: 640, height: 200, transform: "translateZ(380px)", filter: "blur(6px)" }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ position: "absolute", left: i * 46, top: -i * 36, width: 620 - i * 70, height: 66, borderRadius: 6, background: "linear-gradient(#78818b, #424950 55%, #262a2f)", boxShadow: "0 10px 20px rgba(0,0,0,0.5)" }} />
        ))}
      </div>
      {/* 手前の右上：クレーンの鎖とフック */}
      <div style={{ position: "absolute", left: 860, top: 40, width: 70, height: 460, transform: `translateZ(280px) rotate(${sway}deg)`, transformOrigin: "35px 0px", filter: "blur(4px)" }}>
        <div style={{ position: "absolute", left: 27, top: 0, width: 16, height: 360, borderRadius: 8, background: "repeating-linear-gradient(#9aa0a6 0 20px, #4b5056 20px 30px)" }} />
        <div style={{ position: "absolute", left: 2, top: 350, width: 66, height: 86, border: "14px solid #5d636a", borderTopColor: "transparent", borderRadius: "0 0 44px 44px" }} />
      </div>
    </>
  );
};

// 手前を漂う、大きくぼけたほこり（奥行きの手がかり）
const NearDust: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const x = (random(`nx${i}`) * 1300 - 110 + frame * (0.4 + random(`ns${i}`) * 0.5)) % 1300 - 110;
        const y = 120 + random(`ny${i}`) * 820 + Math.sin(frame / (28 + i * 3) + i) * 22;
        const r = 10 + random(`nr${i}`) * 16;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: "50%", background: "rgba(255,236,190,0.22)", filter: "blur(5px)", transform: "translateZ(220px)" }} />;
      })}
    </>
  );
};

const Scene3D: React.FC<{ p: WorkSceneProps }> = ({ p }) => {
  const frame = useCurrentFrame();
  const d = p.depth!;
  const cam = camAt(frame, d.cam);
  const bgBlur = interpolate(cam.z, [0, 260], [0.6, 3.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ perspective: `${P3}px`, perspectiveOrigin: "50% 78%", overflow: "hidden" }}>
      <AbsoluteFill style={{ transformStyle: "preserve-3d", transformOrigin: "540px 840px", transform: `translateZ(${cam.z}px) rotateY(${cam.yaw}deg) translateX(${-cam.x}px)` }}>
        <AbsoluteFill style={{ transform: `translateZ(${BG_Z}px) scale(${((P3 - BG_Z) / P3) * 1.22})`, filter: `blur(${bgBlur}px)` }}>
          <WorkshopBg src={p.bg} panFrom={0} panTo={0} zoomFrom={1} zoomTo={1.03} />
        </AbsoluteFill>
        {/* キャラは前後の位置だけ変える（画面いっぱいの板を回すと、Chromeの描画でキャラが消えることがあった） */}
        {Object.entries(p.actors).map(([id, a], n) => (
          <AbsoluteFill key={id} style={{ transform: `translateZ(${d.actorZ[id] ?? 0}px)` }}>
            <ActorView id={id} a={a} p={p} seed={n * 5} />
          </AbsoluteFill>
        ))}
        <NearDust />
        <Foreground />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const WorkScene: React.FC<WorkSceneProps> = (p) => (
  <AbsoluteFill style={{ background: "#2B2620" }}>
    {p.depth ? (
      <Scene3D p={p} />
    ) : (
      <Camera cuts={p.cuts}>
        <WorkshopBg src={p.bg} />
        {Object.entries(p.actors).map(([id, a], n) => (
          <ActorView key={id} id={id} a={a} p={p} seed={n * 5} />
        ))}
      </Camera>
    )}
    {(p.inserts ?? []).map((ins, i) => (
      <Sequence key={`ins-${i}`} from={ins.start} durationInFrames={ins.end - ins.start} name={`画面 ${i + 1}`}>
        <InsertPanel ins={ins} />
      </Sequence>
    ))}
    <Audio src={staticFile(`audio/${p.bgm}`)} loop volume={(f) => p.bgmVolume * interpolate(f, [p.total - 30, p.total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    {p.lines.map((l, i) => (
      <Sequence key={i} from={l.start} durationInFrames={l.frames} name={`${i + 1} ${p.actors[l.speaker].name}`}>
        <Bubble text={l.text} name={p.actors[l.speaker].name} color={p.actors[l.speaker].color} tailX={p.actors[l.speaker].x} />
        <Audio src={staticFile(`audio/${l.voice}`)} from={l.lead} volume={1} />
      </Sequence>
    ))}
    {p.hook ? (
      <Sequence from={0} durationInFrames={p.hook.frames} name="冒頭の見出し">
        <Hook text={p.hook.text} frames={p.hook.frames} />
      </Sequence>
    ) : null}
    {p.badge ? <div style={{ position: "absolute", right: 34, top: 14, padding: "4px 16px", borderRadius: 14, background: "rgba(20,16,10,0.62)", fontFamily: FONT, fontSize: 28, fontWeight: 800, color: "#FFD23F" }}>{p.badge}</div> : null}
    {p.next ? (
      <Sequence from={p.total - p.next.frames} durationInFrames={p.next.frames} name="つづく">
        <NextCard text={p.next.text} frames={p.next.frames} />
      </Sequence>
    ) : null}
    <div style={{ position: "absolute", right: 36, bottom: 18, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{p.credit}</div>
  </AbsoluteFill>
);

export const calcWorkSceneMetadata: CalculateMetadataFunction<WorkSceneProps> = ({ props }) => ({ durationInFrames: Math.max(30, props.total) });
