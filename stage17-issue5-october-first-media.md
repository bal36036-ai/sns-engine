# Issue #5｜10月1日の画像・動画素材

2026-09-25。Issue #5の残り43件の画像・動画投稿から、日付順で10月1日の2件を制作した。いずれも**GitHub上で確認するための下書き素材**。

## 画像：Instagram `cal-20261001-a`

- [5枚の一覧](assets/issue5/future/20261001/20261001-instagram-contact.jpg)
- [画像とセットにする投稿本文](assets/issue5/future/20261001/publication-copy.md)
- [1枚目](assets/issue5/future/20261001/20261001_instagram_01.png)／[2枚目](assets/issue5/future/20261001/20261001_instagram_02.png)／[3枚目](assets/issue5/future/20261001/20261001_instagram_03.png)／[4枚目](assets/issue5/future/20261001/20261001_instagram_04.png)／[5枚目](assets/issue5/future/20261001/20261001_instagram_05.png)
- 構成は保存済みの[10月1日案](stage11-issue5-remaining.md)に沿い、条件整理→入力の実画面→結果の実画面→まとめの順。3・4枚目のスクリーンショットは、現行ハリナビ V26.09.062 の動作確認例から取得した元画像を配置した。スパン長3,000mm、吊り荷2t、曲げ応力69.691N/mm²は元の実画面と一致する。
- 1・2・5枚目の図は「説明図／画面表示ではありません」と表示。5枚目に「一次照査の補助」「最終判断は専門家へ」を記載。

## 動画：TikTok `cal-20261001-a`

- [ナレーション付き動画・27秒](assets/issue5/future/20261001/20261001-tiktok-harinavi-narrated.mp4)
- 5場面。冒頭に実際の曲げ応力の表示→スパン長・吊り荷の入力→結果と入力の照合→入力条件と専門家による最終判断。実画面の静止画を固定表示し、場面間のみ短いフェードを使用。操作録画ではない。
- 音声はローカルのVOICEVOX Nemo 0.24.0、女声1・ノーマル（speaker 10005）。BGM・効果音なし。音声クレジットはレビュー用投稿本文に1回だけ追記する。
- [動画とセットにする投稿本文](assets/issue5/future/20261001/publication-copy.md)に「音声：VOICEVOX Nemo」を1回付けた。画面の数値は動作確認用の例であり、最終判断は専門家が行う旨を維持した。

## 確認結果と状態

- Instagram画像5枚：各1080×1350。5枚の一覧を目視で確認した。説明図と実画面の区別、数値、文字の欠けを確認した。
- 動画：H.264 720×1280、24fps、AAC 48kHz、27.00秒。冒頭・中盤・結末のフレームを目視確認し、文字の欠けと数値の誤記は見つからなかった。音声は5場面に収まり、音量測定は平均 -17.7dB、最大 -1.5dB。実際に聴いた際の発音・自然さは未確認。
- 当該2件のデータベース状態は変更していない。43件のうち2件にレビュー用素材ができ、未制作は41件。`waiting_media`／`draft` の変更、素材URL登録、ready化、Buffer登録、SNS投稿は実施していない。
- 初週8本の音声についても[前工程の未確認事項](stage16-issue5-audio-check-and-workflow.md)を維持する。独立して進められる素材制作は継続する。

再制作用：[Instagram画像の処理](assets/issue5/future/20261001/build_instagram.py)／[動画と音声の処理](assets/issue5/future/20261001/render_narrated.py)。元画面は[初週の実画面](assets/issue5/video/source/)を参照。ハリナビの現行版が変わった場合は再撮影と数値照合が必要。
