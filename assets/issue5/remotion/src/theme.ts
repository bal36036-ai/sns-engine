export const W = 1080;
export const H = 1080;
export const FPS = 30;

export const COLORS = {
  paper: "#F8F4EC",
  navy: "#1F2D3D",
  muted: "#5F6B76",
  orange: "#D9622B",
  line: "#D9D2C5",
  white: "#FFFFFF",
  partA: "#5B6B7B",
  partB: "#7B5EA7",
  partC: "#2E8B6F",
} as const;

export const FONT = "'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif";

// 1080px幅の動画では、見出しは84px以上、補足は44px以上、左右80px・上下100px以上の余白を守る
export const SAFE_X = 80;
export const SAFE_TOP = 100;
export const SAFE_BOTTOM = 100;

// 実画面（キリドリ）で確認した動作確認用の例：定尺6,000mm・刃幅5mm・部材 A2,500×2／B1,800×2／C1,200×2
export const STOCK_MM = 6000;
export const KERF_MM = 5;
export const PARTS = {
  A: { mm: 2500, color: COLORS.partA, name: "A" },
  B: { mm: 1800, color: COLORS.partB, name: "B" },
  C: { mm: 1200, color: COLORS.partC, name: "C" },
} as const;
