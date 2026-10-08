import { Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "./theme";

// 梁に荷物を吊ると曲がる様子の説明図（アニメ）。単純支持／両端固定／2つを並べる。
// 曲がりの形は、真ん中に1つの荷重がかかったときの式（単純支持：3ξ−4ξ³、両端固定：ξ²(3−4ξ)、0≦ξ≦1/2で左右対称）。
// 両端固定の最大のたわみは、単純支持の1/4（PL³/192EI と PL³/48EI）。図は同じ倍率で大きく描く。
export type BeamMode = "simple" | "fixed" | "both";
export type BeamDiagramSpec = { mode: BeamMode; start: number };

const W = 690;
const H = 600;
const AMP = 70; // 単純支持の真ん中の下がり（画素、大きく描いている）
const STEEL = "#3A4D63";
const STEEL_LIGHT = "#7D8EA3";
const GROUND = "#8A7F70";

const shape = (xi: number, mode: "simple" | "fixed") => {
  const t = xi > 0.5 ? 1 - xi : xi;
  return mode === "simple" ? 3 * t - 4 * t ** 3 : 4 * t * t * (3 - 4 * t);
};

// 荷物を吊ってから曲がるまでの進み（0→1、少しだけ揺れて止まる）
const useLoad = (start: number) => {
  const f = useCurrentFrame() - start;
  const drop = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const bend = interpolate(f, [16, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 1, 0.68, 1) });
  const wobble = f > 46 ? 0.1 * Math.exp(-(f - 46) / 9) * Math.sin((f - 46) / 2.6) : 0;
  return { drop, p: bend + wobble };
};

const Beam: React.FC<{ cy: number; x0: number; x1: number; mode: "simple" | "fixed"; p: number; drop: number; small?: boolean }> = ({ cy, x0, x1, mode, p, drop, small }) => {
  const L = x1 - x0;
  const amp = (mode === "simple" ? AMP : AMP / 4) * p;
  const pts = Array.from({ length: 41 }, (_, i) => {
    const xi = i / 40;
    return [x0 + xi * L, cy + amp * shape(xi, mode)] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const th = small ? 18 : 24; // 梁の高さ（描き方）
  const xc = x0 + L / 2;
  const mid = cy + amp;
  const sling = small ? 46 : 70;
  const bw = small ? 84 : 116;
  const bh = small ? 52 : 74;
  const top = mid + th / 2 + sling - (1 - drop) * 50;
  const wallH = small ? 110 : 160;
  const support =
    mode === "simple" ? (
      <g>
        <polygon points={`${x0},${cy + th / 2} ${x0 - 24},${cy + th / 2 + 42} ${x0 + 24},${cy + th / 2 + 42}`} fill={COLORS.white} stroke={STEEL} strokeWidth={5} />
        <polygon points={`${x1},${cy + th / 2} ${x1 - 22},${cy + th / 2 + 34} ${x1 + 22},${cy + th / 2 + 34}`} fill={COLORS.white} stroke={STEEL} strokeWidth={5} />
        <circle cx={x1 - 12} cy={cy + th / 2 + 42} r={7} fill={COLORS.white} stroke={STEEL} strokeWidth={4} />
        <circle cx={x1 + 12} cy={cy + th / 2 + 42} r={7} fill={COLORS.white} stroke={STEEL} strokeWidth={4} />
        <line x1={x0 - 44} x2={x0 + 44} y1={cy + th / 2 + 44} y2={cy + th / 2 + 44} stroke={GROUND} strokeWidth={5} />
        <line x1={x1 - 44} x2={x1 + 44} y1={cy + th / 2 + 52} y2={cy + th / 2 + 52} stroke={GROUND} strokeWidth={5} />
      </g>
    ) : (
      <g>
        {[x0 - 46, x1].map((wx, k) => (
          <g key={k}>
            <rect x={wx} y={cy - wallH / 2} width={46} height={wallH} fill="#E9E2D6" stroke={GROUND} strokeWidth={4} />
            {Array.from({ length: Math.round(wallH / 22) - 1 }, (_, j) => (
              <line key={j} x1={wx} y1={cy - wallH / 2 + 32 + j * 22} x2={wx + 46} y2={cy - wallH / 2 + 10 + j * 22} stroke={GROUND} strokeWidth={3} />
            ))}
          </g>
        ))}
      </g>
    );
  return (
    <g>
      {/* 曲がる前の位置（点線） */}
      <line x1={x0} x2={x1} y1={cy} y2={cy} stroke={STEEL_LIGHT} strokeWidth={3} strokeDasharray="10 9" opacity={Math.min(1, p * 3)} />
      {support}
      {/* 梁（H形鋼を横から見た形：上下のフランジと、間のウェブ） */}
      <path d={d} fill="none" stroke={STEEL} strokeWidth={th} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={STEEL_LIGHT} strokeWidth={th - 10} strokeLinejoin="round" />
      {/* 吊り荷（ワイヤー2本と荷物） */}
      <g opacity={drop}>
        <line x1={xc - 8} y1={mid + th / 2} x2={xc - bw / 2 + 12} y2={top} stroke={COLORS.navy} strokeWidth={4} />
        <line x1={xc + 8} y1={mid + th / 2} x2={xc + bw / 2 - 12} y2={top} stroke={COLORS.navy} strokeWidth={4} />
        <rect x={xc - bw / 2} y={top} width={bw} height={bh} rx={8} fill={COLORS.orange} />
        <text x={xc} y={top + bh / 2 + (small ? 11 : 15)} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={small ? 30 : 42} fill={COLORS.white}>
          2t
        </text>
      </g>
    </g>
  );
};

export const BeamDiagram: React.FC<{ spec: BeamDiagramSpec }> = ({ spec }) => {
  const { drop, p } = useLoad(spec.start);
  const label = (y: number, text: string, x = 40, anchor: "start" | "end" = "start") => (
    <text x={x} y={y} textAnchor={anchor} fontFamily={FONT} fontWeight={900} fontSize={40} fill={COLORS.navy}>
      {text}
    </text>
  );
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 50, top: 300, overflow: "visible" }}>
      {spec.mode === "both" ? (
        <>
          {label(44, "単純支持", 600, "end")}
          <Beam cy={125} x0={90} x1={600} mode="simple" p={p} drop={drop} small />
          {label(296, "両端固定", 600, "end")}
          <Beam cy={365} x0={90} x1={600} mode="fixed" p={p} drop={drop} small />
        </>
      ) : (
        <>
          {label(60, spec.mode === "simple" ? "単純支持：端は回れる" : "両端固定：端は回らない")}
          <Beam cy={220} x0={100} x1={600} mode={spec.mode} p={p} drop={drop} />
        </>
      )}
    </svg>
  );
};
