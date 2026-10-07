import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Caption } from "./Caption";
import { Headline } from "./Headline";
import { SceneFrame } from "./SceneFrame";
import { PartKey, StockBar } from "./StockBar";
import { COLORS, SAFE_X } from "./theme";

export type Stock = { label: string; parts: PartKey[]; remainMm: number };

type Props = {
  headline: string;
  stocks: Stock[];
  resultText: string;
  highlight: string;
  caption: string;
};

const ROW_TOP = 230;
const ROW_PITCH = 165; // 見出し（約66px）＋棒（96px）＋すきま

export const ResultScene: React.FC<Props> = ({ headline, stocks, resultText, highlight, caption }) => {
  const frame = useCurrentFrame();
  const lastBarEnd = ROW_TOP + (stocks.length - 1) * ROW_PITCH + 66 + 96;
  const showAt = 30 + stocks.length * 14 + 14;
  return (
    <SceneFrame>
      <Headline lines={[headline]} />
      {stocks.map((s, i) => (
        <StockBar key={s.label} label={s.label} parts={s.parts} remainMm={s.remainMm} top={ROW_TOP + i * ROW_PITCH} delay={20 + i * 14} />
      ))}
      <Interactive.Div
        name="Result"
        style={{
          position: "absolute",
          left: SAFE_X,
          top: lastBarEnd + 20,
          fontSize: 64,
          lineHeight: 1.2,
          fontWeight: 900,
          color: COLORS.navy,
          opacity: interpolate(frame, [showAt, showAt + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [showAt, showAt + 14], [0.9, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
          transformOrigin: "left center",
        }}
      >
        {resultText}
        <span style={{ color: COLORS.orange }}>{highlight}</span>
      </Interactive.Div>
      <Caption text={caption} delay={showAt + 6} />
    </SceneFrame>
  );
};
