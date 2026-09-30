// Bufferのチャンネル定義（投稿処理・ready昇格・公開前確認・カレンダーで共通に使う）。
// 2026-10-01 ばる判断：Instagramは見られた数が少ないため一時停止し、Bufferの枠（無料は3チャンネルまで）をXに替える。
//  - instagram は PAUSED_SNS に入れて自動投稿の対象から外す（再開するときは PAUSED_SNS から外し、チャンネルをBufferにつなぎ直す）。
//  - x は、BufferにXをつないでチャンネルIDが分かったら、下の CHANNEL_MAP.x に入れる。入れるまでは接続待ち（waiting_channel）のまま動かない。
const CHANNEL_MAP = {
  instagram: "6a9ce332cd8b9c702c154469",
  tiktok: "6a9ce544cd8b9c702c154892",
  youtube: "6a9ce3facd8b9c702c154605",
  x: "6abd8087ea19ca0bde398054", // 2026-10-01 BufferにXをつないだ（@genba_apps）
};
const PAUSED_SNS = ["instagram"];
// 画像・動画がなくても投稿できる媒体（本文だけで投稿する）
const TEXT_ONLY_SNS = ["threads", "x"];

const ACTIVE_BUFFER_MAP = Object.fromEntries(
  Object.entries(CHANNEL_MAP).filter(([sns, id]) => id && !PAUSED_SNS.includes(sns))
);
// Threads は公式APIで別経路
const AUTOMATED_SNS = [...Object.keys(ACTIVE_BUFFER_MAP), "threads"];

module.exports = { CHANNEL_MAP, PAUSED_SNS, TEXT_ONLY_SNS, ACTIVE_BUFFER_MAP, AUTOMATED_SNS };
