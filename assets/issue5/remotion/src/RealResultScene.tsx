import { Caption } from "./Caption";
import { Headline } from "./Headline";
import { SceneFrame } from "./SceneFrame";
import { Mark, Screen, ScreenNote } from "./Screen";

// 実画面：前半は定尺ごとの切り出し図、後半は結果のまとめ（必要定尺本数・歩留まり率）にオレンジの枠
type Props = {
  tag: "inputorder" | "auto";
  stocks: number;
  headline: string;
  caption: string;
  switchAt: number; // まとめの画面に切り替えるフレーム（声で本数を言う少し前）
  mark1At: number; // 「必要定尺本数」に枠を出すフレーム（声で本数を言う時刻）
  mark2At: number; // 「歩留まり率」に枠を出すフレーム（声で歩留まりを言う時刻）
};

const STOCK_W = 760;
const SUM_W = 900;

export const RealResultScene: React.FC<Props> = ({ tag, stocks, headline, caption, switchAt, mark1At, mark2At }) => {
  const stockH = Math.round((302 * STOCK_W) / 1032);
  const sumH = Math.round((460 * SUM_W) / 1032);
  return (
    <SceneFrame>
      <Headline lines={[headline]} size={84} />
      <ScreenNote top={208} />
      {Array.from({ length: stocks }, (_, i) => (
        <Screen
          key={i}
          name={`Stock ${i + 1}`}
          file={`stock${i + 1}-${tag}.png`}
          srcW={1032}
          srcH={302}
          left={(1080 - STOCK_W) / 2}
          top={262 + i * (stockH + 14)}
          width={STOCK_W}
          appearAt={10 + i * 12}
          hideAt={switchAt - 6}
        />
      ))}
      <Screen name="Summary" file={`summary-${tag}.png`} srcW={1032} srcH={460} left={(1080 - SUM_W) / 2} top={290} width={SUM_W} appearAt={switchAt}>
        {/* 左上：必要定尺本数／右の2段目：歩留まり率（画面の配置に合わせた割合） */}
        <Mark x={0.005} y={0.005} w={0.49} h={0.305} at={mark1At} width={SUM_W} height={sumH} />
        <Mark x={0.505} y={0.345} w={0.49} h={0.305} at={mark2At} width={SUM_W} height={sumH} />
      </Screen>
      <Caption text={caption} delay={switchAt + 20} />
    </SceneFrame>
  );
};
