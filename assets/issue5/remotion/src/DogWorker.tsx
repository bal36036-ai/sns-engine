import { interpolate, useCurrentFrame } from "remotion";

// 職人ワンちゃん：ブラック＆シルバーのミニチュアシュナウザー（2026-10-08 ばる指定）。図形だけで描く（他人の絵・既存キャラクターは使わない）。
// mouth：0（閉じる）〜1（大きく開く）。声の大きさから毎フレーム渡す。
// pose：talk（話す）／sweat（困る・汗）／question（首をかしげて手を上げる）／happy（にっこり）
export type DogPose = "talk" | "sweat" | "question" | "happy";

const C = {
  black: "#2B2C31",
  blackHi: "#3C3E45",
  silver: "#CDD1D6",
  silverHi: "#ECEEF0",
  silverDark: "#A7ADB5",
  nose: "#151517",
  helmet: "#F3C433",
  helmetDark: "#D9A514",
  jacket: "#34516B",
  jacketDark: "#263D52",
  vest: "#E8692B",
  reflect: "#F4F1E8",
  towel: "#FFFFFF",
  towelLine: "#D6DEE6",
  tongue: "#E46A6A",
  mouthIn: "#4A2420",
  sweat: "#7CC3EA",
};

export const DogWorker: React.FC<{ mouth: number; pose: DogPose; x?: number; y?: number; scale?: number }> = ({ mouth, pose, x = 0, y = 0, scale = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame % 96;
  const blink = t >= 90 && t <= 93 ? 0.12 : 1; // 約3.2秒ごとにまばたき
  const open = Math.max(0, Math.min(1, mouth));
  const bob = Math.sin(frame / 5) * 1.6 * Math.min(1, open * 2.5); // 話している間は頭が少しゆれる
  const tilt = pose === "question" ? interpolate(frame, [0, 12], [0, -9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const breathe = Math.sin(frame / 18) * 3;
  const armUp = pose === "question" || pose === "happy" ? interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const sweatY = pose === "sweat" ? (frame % 40) * 0.9 : 0;
  const sweatOp = pose === "sweat" ? interpolate(frame % 40, [0, 6, 32, 40], [0, 1, 1, 0]) : 0;
  const browTilt = pose === "sweat" ? 14 : pose === "happy" ? -6 : 0; // 困ると眉が八の字
  const jaw = 34 * open; // あごひげごと下がる

  return (
    <svg viewBox="0 0 600 740" width={600 * scale} height={740 * scale} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      <ellipse cx="300" cy="715" rx="190" ry="18" fill="rgba(31,45,61,0.14)" />
      {/* しっぽ（短い） */}
      <g transform={`rotate(${Math.sin(frame / 3) * 14} 420 590)`}>
        <path d="M420 590 Q 455 545 470 520" fill="none" stroke={C.black} strokeWidth="26" strokeLinecap="round" />
      </g>
      {/* 体（作業着＋ベスト） */}
      <g transform={`translate(0 ${breathe * 0.4})`}>
        <path d="M170 705 L 185 485 Q 300 435 415 485 L 430 705 Z" fill={C.jacket} />
        <path d="M205 705 L 214 500 Q 300 467 386 500 L 395 705 Z" fill={C.vest} />
        <rect x="205" y="600" width="190" height="16" fill={C.reflect} />
        <rect x="205" y="645" width="190" height="16" fill={C.reflect} />
        <path d="M300 485 L 300 705" stroke={C.jacketDark} strokeWidth="6" />
        <rect x="318" y="525" width="52" height="40" rx="6" fill={C.vest} stroke="#C9531E" strokeWidth="4" />
        <rect x="330" y="511" width="8" height="30" rx="3" fill="#9AA6B2" />
        {/* 左腕（シルバーの前足） */}
        <path d="M188 495 Q 140 575 160 662" fill="none" stroke={C.jacket} strokeWidth="56" strokeLinecap="round" />
        <circle cx="160" cy="668" r="30" fill={C.silver} />
        <path d="M146 684 L 148 692 M160 688 L 160 697 M174 684 L 172 692" stroke={C.silverDark} strokeWidth="4" strokeLinecap="round" />
        {/* 右腕（上げられる） */}
        <g transform={`rotate(${-150 * armUp} 410 500)`}>
          <path d="M410 500 Q 455 580 440 662" fill="none" stroke={C.jacket} strokeWidth="56" strokeLinecap="round" />
          <circle cx="440" cy="668" r="30" fill={C.silver} />
          <path d="M426 684 L 428 692 M440 688 L 440 697 M454 684 L 452 692" stroke={C.silverDark} strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>
      {/* 首のタオル */}
      <path d="M200 470 Q 300 525 400 470 L 405 500 Q 300 560 195 500 Z" fill={C.towel} stroke={C.towelLine} strokeWidth="5" />
      <path d="M368 495 L 382 575 L 352 575 L 345 507 Z" fill={C.towel} stroke={C.towelLine} strokeWidth="5" />
      {/* 頭 */}
      <g transform={`translate(0 ${bob + breathe * 0.6}) rotate(${tilt} 300 330)`}>
        {/* 折れ耳（前に垂れる三角） */}
        <path d="M150 200 Q 128 150 178 138 L 250 176 Q 205 214 186 268 Q 160 250 150 200 Z" fill={C.black} />
        <path d="M450 200 Q 472 150 422 138 L 350 176 Q 395 214 414 268 Q 440 250 450 200 Z" fill={C.black} />
        {/* 頭（四角っぽい黒） */}
        <path d="M168 210 Q 170 160 300 152 Q 430 160 432 210 L 440 360 Q 300 395 160 360 Z" fill={C.black} />
        <path d="M205 190 Q 300 172 395 190" fill="none" stroke={C.blackHi} strokeWidth="10" strokeLinecap="round" opacity="0.7" />
        {/* 目 */}
        <ellipse cx="245" cy="282" rx="17" ry={19 * blink} fill="#0E0E10" />
        <ellipse cx="355" cy="282" rx="17" ry={19 * blink} fill="#0E0E10" />
        {blink > 0.5 ? (
          <>
            <circle cx="251" cy="275" r="5.5" fill="#fff" />
            <circle cx="361" cy="275" r="5.5" fill="#fff" />
          </>
        ) : null}
        {/* シルバーのもじゃもじゃ眉 */}
        <g transform={`rotate(${browTilt} 240 252)`}>
          <path d="M196 262 Q 205 228 240 232 Q 268 234 282 250 Q 262 246 250 252 Q 232 246 214 262 Z" fill={C.silver} />
          <path d="M206 254 Q 222 238 244 240 M222 256 Q 240 246 262 246" stroke={C.silverHi} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
        <g transform={`rotate(${-browTilt} 360 252)`}>
          <path d="M404 262 Q 395 228 360 232 Q 332 234 318 250 Q 338 246 350 252 Q 368 246 386 262 Z" fill={C.silver} />
          <path d="M394 254 Q 378 238 356 240 M378 256 Q 360 246 338 246" stroke={C.silverHi} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
        {/* 口の中（ひげの下に見える） */}
        {open > 0.08 ? (
          <g>
            <ellipse cx="300" cy={372 + jaw * 0.45} rx="44" ry={10 + jaw * 0.55} fill={C.mouthIn} />
            <ellipse cx="300" cy={384 + jaw * 0.7} rx="24" ry={6 + jaw * 0.25} fill={C.tongue} />
          </g>
        ) : null}
        {/* 上のマズル（シルバー） */}
        <path d="M222 318 Q 300 290 378 318 Q 400 350 372 372 Q 300 386 228 372 Q 200 350 222 318 Z" fill={C.silver} />
        {/* あごひげ（口に合わせて下がる） */}
        <g transform={`translate(0 ${jaw})`}>
          <path d="M224 366 Q 300 392 376 366 Q 392 420 356 462 Q 330 486 300 490 Q 270 486 244 462 Q 208 420 224 366 Z" fill={C.silver} />
          <path d="M262 400 Q 266 440 258 468 M300 404 Q 300 450 300 482 M338 400 Q 334 440 342 468" stroke={C.silverDark} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
        {/* 口ひげの毛並み */}
        <path d="M244 348 Q 262 362 284 356 M356 348 Q 338 362 316 356" stroke={C.silverHi} strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* 鼻 */}
        <path d="M268 312 Q 300 300 332 312 Q 334 336 300 342 Q 266 336 268 312 Z" fill={C.nose} />
        <ellipse cx="290" cy="314" rx="9" ry="4" fill="#4A4B52" />
        {/* ヘルメット */}
        <path d="M140 205 Q 146 62 300 54 Q 454 62 460 205 Z" fill={C.helmet} />
        <path d="M290 56 Q 300 50 310 56 L 316 205 L 284 205 Z" fill={C.helmetDark} opacity="0.55" />
        <rect x="116" y="196" width="368" height="30" rx="15" fill={C.helmetDark} />
        <path d="M190 112 Q 218 84 256 78" fill="none" stroke="#FFF6CC" strokeWidth="12" strokeLinecap="round" opacity="0.8" />
        {/* 汗 */}
        <path d={`M452 ${238 + sweatY} q 14 22 0 30 q -14 -8 0 -30 z`} fill={C.sweat} opacity={sweatOp} />
      </g>
      {pose === "question" ? (
        <text x="500" y="120" fontSize="120" fontWeight="900" fill="#E8692B" fontFamily="'Noto Sans JP','Yu Gothic',sans-serif" opacity={interpolate(frame, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
          ？
        </text>
      ) : null}
    </svg>
  );
};
