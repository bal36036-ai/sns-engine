import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// 加工場の背景（AIで描いた1枚の絵）を「生きた背景」にする：カメラがゆっくり寄って横に流れる、窓からの光の筋がゆらぐ、光の中をほこりが舞う。
// 動画全体で1つだけ置く（場面が変わってもカメラが途切れないように）。
export const WorkshopBg: React.FC<{ src: string; panFrom?: number; panTo?: number; zoomFrom?: number; zoomTo?: number; dim?: number }> = ({
  src,
  panFrom = -30,
  panTo = 30,
  zoomFrom = 1.08,
  zoomTo = 1.16,
  dim = 0.06,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames - 1);
  const zoom = interpolate(t, [0, 1], [zoomFrom, zoomTo]);
  const pan = interpolate(t, [0, 1], [panFrom, panTo]);
  const flicker = 0.85 + Math.sin(frame / 23) * 0.08 + Math.sin(frame / 7.3) * 0.03;
  const dust = Array.from({ length: 70 }, (_, i) => {
    const sx = random(`dx${i}`) * width;
    const sy = random(`dy${i}`) * height * 0.8;
    const speed = 0.15 + random(`ds${i}`) * 0.35;
    const x = (sx + frame * speed * 0.6 + Math.sin(frame / (30 + i) + i) * 12) % width;
    const y = (sy - frame * speed + height) % height;
    const r = 1.5 + random(`dr${i}`) * 2.5;
    const a = (0.25 + random(`da${i}`) * 0.5) * (0.6 + 0.4 * Math.sin(frame / 15 + i));
    return { x, y, r, a };
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#2B2620" }}>
      <Img
        src={staticFile(src)}
        style={{ position: "absolute", left: "50%", top: "50%", height: "100%", minWidth: "100%", objectFit: "cover", translate: `calc(-50% + ${pan}px) -50%`, scale: `${zoom}` }}
      />
      {/* 窓からの光の筋 */}
      <AbsoluteFill
        style={{
          background: "repeating-linear-gradient(115deg, rgba(255,230,170,0) 0px, rgba(255,230,170,0) 90px, rgba(255,226,160,0.16) 120px, rgba(255,230,170,0) 170px, rgba(255,230,170,0) 260px)",
          opacity: flicker,
          mixBlendMode: "screen",
          maskImage: "linear-gradient(180deg, #000 0%, #000 55%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 55%, transparent 85%)",
        }}
      />
      {/* 舞うほこり */}
      {dust.map((d, i) => (
        <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: d.r * 2, height: d.r * 2, borderRadius: "50%", background: `rgba(255,240,205,${d.a})`, filter: "blur(0.6px)" }} />
      ))}
      {/* 周りを少し暗く（キャラに目が行くように） */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 60%, rgba(0,0,0,0) 55%, rgba(20,14,8,${0.35 + dim}) 100%)` }} />
    </AbsoluteFill>
  );
};
