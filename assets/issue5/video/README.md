# Issue #5 直近7日分・縦型動画素材（画面固定・下部表示なし）

最新の対応：[変更前後と検証結果](../../../stage15-issue5-clean-video-review.md)。Issue #5の23:19のコメントに対応。再確認待ち。

## 制作結果

- 8本のナレーション付きMP4を制作。すべて720×1280、24fps、26〜29秒。以前の無音MP4も比較用として残した。**レビュー対象はファイル名が `-narrated.mp4` で終わる8本**。
- 実アプリの静止画を固定表示する動画。全編の常時ズーム・パンを削除し、2場面目以降の切り替え時のみ約0.16秒のフェードを付けた。操作録画ではない。9/24と9/28のキリドリは冒頭から結果の実画面を見せ、9/26は同じ図が連続しないよう条件・部材入力・結果を順に見せる構成に変更した。
- 画面に合う日本語ナレーションを5場面ごとに配置した。音声はローカル起動した公式 **VOICEVOX Nemo 0.24.0／女声1・ノーマル（speaker 10005）**。BGM・効果音なし。音声は前版から変更なし。「音声：VOICEVOX Nemo」は各投稿の本文・概要欄へ移した。台本と場面秒数は [`narration.json`](narration.json) に記録した。
- 投稿・予約・公開URLへのアップロードはしていない。レビュー用素材として扱う。
- [今回の動画とセットにする投稿本文・概要欄](publication-copy.md)／[機械処理用JSON](publication-copy.json)。既存本文に音声クレジットと必要な安全注意を加えたレビュー原稿。DB・Buffer・SNSには未反映。
- [全8本の冒頭・結末一覧](contact_sheet.jpg)。右隣が同じ動画の結末。[全40場面の一覧](scenes_review.jpg)も参照。今回の変更前はコミット `6d6e3a0` で確認できる。

| 投稿日・媒体 | 投稿キー | 動画ファイル | 実画面・説明素材 |
|---|---|---|---|
| 9/24 TikTok | `cal-20260924-a` | [キリドリ・切り方](20260924-tiktok-kiridori-narrated.mp4) | 結果の実画面→紙メモ→入力→切り出し案 |
| 9/25 YouTube Shorts | `cal-20260925-a` | [ハリナビ・数字の元条件](20260925-youtube-harinavi-narrated.mp4) | 曲げ応力の表示→入力条件→結果 |
| 9/26 TikTok | `cal-20260926-a` | [キリドリ・端材990mm](20260926-tiktok-kiridori-narrated.mp4) | 結果の実画面→条件→部材→結果 |
| 9/27 TikTok | `cal-20260927-a` | [ハリナビ・2tの入力](20260927-tiktok-harinavi-narrated.mp4) | 入力条件と結果を往復 |
| 9/27 YouTube Shorts | `cal-20260927-a` | [ハリナビ・曲げ応力](20260927-youtube-harinavi-narrated.mp4) | 曲げ応力の表示と元条件 |
| 9/28 YouTube Shorts | `cal-20260928-a` | [キリドリ・メモから切り出し図](20260928-youtube-kiridori-narrated.mp4) | 結果の実画面→メモ→入力→結果 |
| 9/29 TikTok | `cal-20260929-a` | [ハリナビ・結果の見方](20260929-tiktok-harinavi-narrated.mp4) | 条件→確認項目→結果 |
| 9/30 YouTube Shorts | `cal-20260930-a` | [キリドリ・入力する3つ](20260930-youtube-kiridori-narrated.mp4) | 定尺→部材→刃幅→結果 |

## 冒頭と結末の再確認

| 動画 | 冒頭0〜2秒 | 結末の導線 |
|---|---|---|
| 9/24 TikTok | 6m材、どう切る？ | キリドリで材料ごとの切り方を見てみる |
| 9/25 YouTube | 曲げ応力69.691、元条件は？ | 数字の出どころを保存 |
| 9/26 TikTok | 6m材の端材990mm、どこから？ | ほかの材料はどう切る？ |
| 9/27 TikTok | 2tの入力、結果のどこを見る？ | 入力条件から見返す |
| 9/27 YouTube | 曲げ応力69.691、どの条件？ | 比較用に条件を残す |
| 9/28 YouTube | メモが切り出し図に？ | 同じ条件で切り方を見てみる |
| 9/29 TikTok | 曲げ応力69.691、どこから読む？ | 続きで結果画面の見方へ |
| 9/30 YouTube | 6m材の切り方、入力はこの3つ | 次は結果画面の見方へ |

## 画面と数値の照合

- キリドリ: `KiridoriApp/STATUS.md` にある現行の `kiridori_v60.html` をローカルで開き、定尺長6,000mm、刃幅5mm、部材2,500mm・1,800mm・1,200mmを各2本入力した状態と、その計算結果を撮影。結果画面の1本目は「2部材・2切断／残990mm」。動画の数値と一致する。
- ハリナビ: `HarinaviApp/STATUS.md` が指す現行の `harinavi_V26.09.062.html` をローカルで開き、スパン長3,000mm、吊り荷の質量2tで検算を実行。結果画面に表示された曲げ応力69.691N/mm²と入力条件を照合した。専門家による最終判断の注意は全ハリナビ4件の投稿本文・概要欄へ移した。実アプリ画面自体に含まれる注意文や一次照査の説明はそのまま。
- 下部のブランド名・動作確認用の例・出典・音声クレジット・安全注意の常時表示はすべて削除。数値が例であることは投稿本文側に明記。紙メモ場面にはその場面だけの説明用注記を残した。元の実画面は変更していない。

## 再制作

`node assets/issue5/video/capture-source.cjs` で現行アプリの画面を取得し、`python assets/issue5/video/make_source_crops.py` で結果の実画面を切り出す。既存音声をそのまま使う場合は `python assets/issue5/video/render-narrated-videos.py --reuse-audio` で書き出す。音声を再生成するときだけ公式VOICEVOX Nemoを `127.0.0.1:50121` で起動し、同コマンドから `--reuse-audio` を外す。`python assets/issue5/video/make_contact_sheet.py` で書き出したMP4から一覧を更新する。`node assets/issue5/video/make-publication-copy.cjs` で投稿用原稿を生成する。再制作時は現行版と画面内の数値を再照合すること。`source/` は照合用の実画面、`frames/` は動画生成用フレーム。既存の `frames/*.txt` は初版の静止画連結記録で、今回の書き出しには使用しない。

## 今回の検証

`node assets/issue5/verify-media.cjs --video-only --audio-baseline=6d6e3a0 --report=assets/issue5/video/verification.json` 成功。[検証結果](verification.json)に8本・40場面の静止確認、下部の空白、音声の一致、寸法・長さを記録した。投稿用原稿8件の音声クレジット・ハリナビ4件の専門家による最終判断の記載も確認した。

音声の聴感による自然さと公開判断は再確認待ち。ready化・投稿・予約・Buffer登録・素材URL登録はしていない。
