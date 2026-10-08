import { Img, staticFile, useCurrentFrame } from "remotion";

// 1枚の絵を「頭」と「体」に分けて動かす（首かしげ・うなずき・呼吸）。口と目は、同じ絵の差分の一部だけを重ねて口パク・まばたきにする。
// rig：tools/ や キャラクター/職人黒シュナ/align_face_variants.py が作る rig.json の中身＋このファイル用の設定
export type Region = [number, number, number, number]; // x0, y0, x1, y1（元の絵の画素）
export type Rig = {
  dir: string; // public 以下のフォルダ
  size: [number, number];
  neckY: number; // 首の高さ（これより上が頭）
  pivot: [number, number]; // 頭を回す中心（あご）
  mouth: { half: string; open: string; region: Region };
  eyes?: { closed: string; region: Region };
};

const ellipseMask = (r: Region, W: number, H: number, grow = 1.35) => {
  const cx = ((r[0] + r[2]) / 2 / W) * 100;
  const cy = ((r[1] + r[3]) / 2 / H) * 100;
  const rx = (((r[2] - r[0]) / 2) * grow / W) * 100;
  const ry = (((r[3] - r[1]) / 2) * grow / H) * 100;
  return `radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%, #000 55%, transparent 100%)`;
};

export const PuppetDog: React.FC<{
  rig: Rig;
  height: number;
  x: number; // 足元の中心
  feetY: number;
  mouth: number; // 0〜1（声の大きさ）
  talking: boolean;
  tilt?: number; // 首かしげ（度）
  seed?: number;
  offset?: number; // 場面の開始フレーム（場面が変わっても揺れやまばたきが途切れないように）
}> = ({ rig, height, x, feetY, mouth, talking, tilt = 0, seed = 0, offset = 0 }) => {
  const frame = useCurrentFrame() + offset + seed * 37;
  const [W, H] = rig.size;
  const s = height / H;
  const width = W * s;
  // 頭：話している間は小さくうなずく、黙っているときはゆっくり揺れる
  const nod = talking ? Math.sin(frame / 4.2) * 2.2 * Math.min(1, mouth * 2) : 0;
  const sway = Math.sin(frame / 37) * 1.6;
  const headRot = tilt + sway * 0.6 + nod * 0.4;
  const headDy = talking ? -Math.abs(Math.sin(frame / 4.2)) * 3 * Math.min(1, mouth * 2) : 0;
  // 体：呼吸と、足元を中心にしたわずかな揺れ
  const breathe = Math.sin(frame / 22) * 0.012;
  const bodyRot = Math.sin(frame / 45) * 0.6;
  // 口：声の大きさで 閉じる／半分／大きく
  const mouthFile = mouth > 0.55 ? rig.mouth.open : mouth > 0.18 ? rig.mouth.half : null;
  // まばたき：だいたい2.5〜4秒に1回、3フレーム
  const cycle = 96 + (seed % 3) * 17;
  const blink = rig.eyes && frame % cycle >= cycle - 3;
  const img = (file: string, extra?: React.CSSProperties) => (
    <Img src={staticFile(`${rig.dir}/${file}`)} style={{ position: "absolute", left: 0, top: 0, width, height, ...extra }} />
  );
  const neck = rig.neckY * s;
  const px = rig.pivot[0] * s;
  const py = rig.pivot[1] * s;
  return (
    <div style={{ position: "absolute", left: x - width / 2, top: feetY - height, width, height, transformOrigin: "50% 100%", rotate: `${bodyRot}deg`, scale: `${1 - breathe * 0.5} ${1 + breathe}` }}>
      {/* 体（首より下。少し上まで重ねて、頭を動かしてもすき間が出ないようにする） */}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(${neck - 14}px 0 0 0)` }}>{img("base.png")}</div>
      {/* 頭（首より上） */}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${height - neck - 6}px 0)`, transformOrigin: `${px}px ${py}px`, rotate: `${headRot}deg`, translate: `0px ${headDy}px` }}>
        {img("base.png")}
        {mouthFile ? img(mouthFile, { maskImage: ellipseMask(rig.mouth.region, W, H), WebkitMaskImage: ellipseMask(rig.mouth.region, W, H) }) : null}
        {blink && rig.eyes ? img(rig.eyes.closed, { maskImage: ellipseMask(rig.eyes.region, W, H, 1.25), WebkitMaskImage: ellipseMask(rig.eyes.region, W, H, 1.25) }) : null}
      </div>
    </div>
  );
};
