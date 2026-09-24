# Issue #5 直近7日分・縦型動画素材

## 制作結果

- 8本制作、未制作0本。すべて720×1280、24fps、26〜29秒のMP4。
- 実アプリの静止画と説明テロップを組み合わせた無音動画。投稿・予約・公開URLへのアップロードはしていない。レビュー用素材として扱う。
- 制作案と本文は `first-week-content.js`、`stage10-issue5-first-week.md` を参照。ここに投稿本文やDB状態を複製しない。

| 投稿日・媒体 | 投稿キー | 動画ファイル | 実画面・説明素材 |
|---|---|---|---|
| 9/24 TikTok | `cal-20260924-a` | `20260924-tiktok-kiridori.mp4` | 紙メモ風の説明用数値、キリドリ基本設定・部材入力・1本目の切り出し図 |
| 9/25 YouTube Shorts | `cal-20260925-a` | `20260925-youtube-harinavi.mp4` | ハリナビ入力条件・計算結果・曲げ応力の表示 |
| 9/26 TikTok | `cal-20260926-a` | `20260926-tiktok-kiridori.mp4` | キリドリ1本目の切り出し図と結果画面 |
| 9/27 TikTok | `cal-20260927-a` | `20260927-tiktok-harinavi.mp4` | ハリナビ入力条件・計算結果 |
| 9/27 YouTube Shorts | `cal-20260927-a` | `20260927-youtube-harinavi.mp4` | ハリナビ入力条件・計算結果 |
| 9/28 YouTube Shorts | `cal-20260928-a` | `20260928-youtube-kiridori.mp4` | 紙メモ風の説明用数値、キリドリ基本設定・切り出し結果 |
| 9/29 TikTok | `cal-20260929-a` | `20260929-tiktok-harinavi.mp4` | ハリナビ入力条件・曲げ応力などの結果項目 |
| 9/30 YouTube Shorts | `cal-20260930-a` | `20260930-youtube-kiridori.mp4` | キリドリ定尺・部材・刃幅の入力と結果 |

## 画面と数値の照合

- キリドリ: `KiridoriApp/STATUS.md` にある現行の `kiridori_v60.html` をローカルで開き、定尺長6,000mm、刃幅5mm、部材2,500mm・1,800mm・1,200mmを各2本入力した状態と、その計算結果を撮影。結果画面の1本目は「2部材・2切断／残990mm」。動画の数値と一致する。
- ハリナビ: `HarinaviApp/STATUS.md` が指す現行の `harinavi_V26.09.062.html` をローカルで開き、スパン長3,000mm、吊り荷の質量2tで検算を実行。結果画面に表示された曲げ応力69.691N/mm²と入力条件を照合した。安全の最終判断は専門家が行う旨を全ハリナビ動画に小さく表示した。
- 全動画に「画面の数値は動作確認用の例です」を表示。紙メモ風の画面はアプリUIではなく説明素材として示した。架空のアプリ画面は作っていない。

## 再制作

`node assets/issue5/video/capture-source.cjs` で現行アプリの画面を取得し、`node assets/issue5/video/render-videos.cjs` で8本を書き出す。再制作時は現行版と画面内の数値を再照合すること。`source/` は照合用の実画面、`frames/` は動画生成用フレーム。
