# Issue #5｜初週動画8本の音声付き版

2026-09-24。Issue #5の[音声付き版を完成版とする指示](https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5812924348)に対応。レビュー対象は以下の8本。無音版も比較用に維持した。

| 投稿日・媒体 | 対象投稿キー | 音声付きレビュー動画 |
|---|---|---|
| 9/24 TikTok | `cal-20260924-a` | [キリドリ・6m材の切り方](assets/issue5/video/20260924-tiktok-kiridori-narrated.mp4) |
| 9/25 YouTube Shorts | `cal-20260925-a` | [ハリナビ・数字の元条件](assets/issue5/video/20260925-youtube-harinavi-narrated.mp4) |
| 9/26 TikTok | `cal-20260926-a` | [キリドリ・端材990mm](assets/issue5/video/20260926-tiktok-kiridori-narrated.mp4) |
| 9/27 TikTok | `cal-20260927-a` | [ハリナビ・2tの入力](assets/issue5/video/20260927-tiktok-harinavi-narrated.mp4) |
| 9/27 YouTube Shorts | `cal-20260927-a` | [ハリナビ・曲げ応力](assets/issue5/video/20260927-youtube-harinavi-narrated.mp4) |
| 9/28 YouTube Shorts | `cal-20260928-a` | [キリドリ・メモから切り出し図](assets/issue5/video/20260928-youtube-kiridori-narrated.mp4) |
| 9/29 TikTok | `cal-20260929-a` | [ハリナビ・結果の見方](assets/issue5/video/20260929-tiktok-harinavi-narrated.mp4) |
| 9/30 YouTube Shorts | `cal-20260930-a` | [キリドリ・入力する3つ](assets/issue5/video/20260930-youtube-kiridori-narrated.mp4) |

## 変更前後

| 対象 | 変更前 | 変更後 |
|---|---|---|
| 全8本 | 動きとテロップはあるが無音 | 5場面それぞれに日本語ナレーションを配置。0〜2秒のフックも音声化 |
| 9/24・9/28 キリドリ | 冒頭が説明用メモ | 実アプリの切り出し結果から始め、メモ→入力→結果へ進む |
| 9/26 キリドリ | 同じ切り出し図が4場面連続 | 定尺と刃幅→必要部材→切り出し図を順に表示 |
| 9/27 TikTok ハリナビ | 「2tの入力」というフックに曲げ応力の画面 | 実際の2t入力欄を冒頭に表示 |
| 全8本の結末 | 説明や次回予告が中心 | 条件を変えたらどうなるか、材料ごとの切り方など、アプリ画面の続きを見たくなる短い導線を追加 |

## 音声と素材

- 音声エンジン：公式のVOICEVOX Nemo 0.24.0をローカル起動。話者は女声1・ノーマル、ID 10005。動画内に「音声：VOICEVOX Nemo」を表示。
- BGM・効果音：なし。結果画面の数字を読む間を残し、声を優先した。
- [8本それぞれの全台本と秒割](assets/issue5/video/narration.json)。音声は各場面の開始から約0.12秒後に入り、次の場面にまたがらない長さに調整した。
- [8本の冒頭と結末の一覧](assets/issue5/video/contact_sheet.jpg)／[画面と数値の照合記録](assets/issue5/video/README.md)。キリドリの6,000mm・刃幅5mm・端材990mm、ハリナビのスパン3,000mm・吊り荷2t・曲げ応力69.691N/mm²は撮影した実画面に合わせた動作確認用の例。ハリナビの一次照査補助と専門家による最終判断の注意は動画内に維持した。

## 確認結果と残る確認

- エンコード後の動画から冒頭・途中・結末を画像として確認。テロップ、元の実画面、音声クレジットが表示範囲内にある。冒頭0〜2秒は8本とも映像に動きがある。
- `node assets/issue5/verify-media.cjs` 成功。動画8本の720×1280、24fps、26〜29秒、H.264映像、AAC音声、音声のデコードと非無音を確認。Instagram画像25枚の寸法確認も成功。
- 合成時に40場面すべてで読み上げ時間を測定し、各場面内に収まることを確認した。台本と実画面の項目を照合した。**聴感による自然さの最終確認はユーザーレビュー待ち**。
- 今回は素材ファイルと制作・検証コードだけを変更。DBの投稿本文・`status`・`readiness_state`・`scheduled_at`・`is_publishable`・`feature_published`、cron、Buffer、Threadsの本番経路には触れていない。ready化、予約、投稿、Buffer登録、素材URL登録はしていない。

動画の公開判断と残りの素材制作は再確認待ち。Issueは開いたままにする。
