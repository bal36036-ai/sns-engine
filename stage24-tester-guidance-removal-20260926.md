# stage24｜テスター誘導の削除：X本文・動画7本の-v2差し替えまで完了

2026-09-26。正本：`../Codex依頼_テスター誘導の削除_20260926.md`。

**完了（2026-09-26 10:11 JST時点）：X下書き1件の本文差し替え（Codex）、動画生成元-v2の追加（Codex）、動画7本の-v2生成・公開配置・7投稿のmedia_urls差し替え（Claude Code、下記8章）。**

1〜7章はCodexが作業した時点（9/26 04:23 JST頃）の記録。Codexの実行環境ではPython・VOICEVOX Nemo・ブラウザが起動できなかったため、残りをClaude Code側で実施した。

## 確定した追加指示

- 生成元も `narration-v2.json`・`render-videos-v2.cjs` として追加する。必要なら音声付き生成スクリプトの `-v2` 版も追加してよい。既存名のファイルは上書きしない。
- DBの既存処理による `updated_at` の自動更新は許可済み。「ほかの列を変更しない」は内容の列を指す。
- GitHub接続失敗は停止理由にしない。コミット・プッシュはClaude Code側が実施する。
- 依頼書内の細かい確認では止めずに進める。尺を延ばす、音声設定を変える、sentやBufferへ影響する変更は行わない。

前回までの保存方法・更新日時の確認待ちは解消済み。現在はユーザーの回答待ちではなく、実行環境の制限で動画工程が実施できない状態。

## 1. X本文：反映・再取得検証済み

- Supabaseプロジェクト：`dvysbebkzvvqyqtlgqcx`
- テーブル：`sns.posts`
- ID：`ec09da89-1eb6-4fcc-9cde-08f58a9191a2`
- 更新列：`body_text` とDBが自動更新した `updated_at` のみ。
- `updated_at`：`2026-09-25T15:24:20.945086+00:00` → `2026-09-25T19:21:43.623832+00:00`（反映後は9/26 04:21:43 JST）。

変更前：

> 材料取りで一番面倒な作業ってどれですか？
> ①組み合わせ ②本数見積り ③端材管理 ④指示書づくり
> 「キリドリ」のテスターも少しずつ募集します。興味あればコメントかDMへ（開発中・ブラウザで試せます／今は無料）。

変更後：

> 材料取りで一番面倒な作業ってどれですか？
> ①組み合わせ ②本数見積り ③端材管理 ④指示書づくり
> コメントで教えてもらえると、「キリドリ」開発の参考にします。アプリストア公開に向けて開発中です。

更新時は対象行を固定し、完全ID・媒体・topic・変更前本文・下書き状態を照合した。更新後の全列を比較し、許可した2列以外に差があれば取り消す処理で実行。その後の別の読み取りでも、本文の改行を含めて依頼書と完全一致し、他の内容列が不変であることを確認した。

`status=draft`、`readiness_state=waiting_channel` を維持。Xの既存 `is_publishable=true`・`feature_published=true` も本文だけの変更指定に従い維持した。ready化・予約・投稿はしていない。

## 2. 追加した生成元

- [narration-v2.json](assets/issue5/video/narration-v2.json)：指定の9月分7本だけを収録。最終行7件を依頼書の文面へ変更。各動画の最初の4行、全場面の秒数、話者の記載は旧版と同一。
- [render-videos-v2.cjs](assets/issue5/video/render-videos-v2.cjs)：キリドリ3本の最終場面のtitle・captionを指定どおり変更。上部のアプリ名は残し、日付・媒体名の表示を削除。
- 新規描画処理は対象7本に限定。出力動画の末尾が `-v2` でない指定は拒否。場面画像も既存の `frames/` 内へ `<動画id>-<場面番号>-v2.png` として出力する仕様。
- 既存 `narration.json`・`render-videos.cjs`・`render-narrated-videos.py`・既存MP4・既存場面画像は変更していない。9/25投稿済み動画と10月動画は再生成していない。旧生成元の共通表示にも影響しない。
- 音声付き生成スクリプトの `-v2` 版は未追加。既存スクリプトをそのまま実行すると旧名に出力するため、続行時にそのまま実行しないこと。

### 生成元の確認結果

- `node --check assets/issue5/video/render-videos-v2.cjs`：成功。
- Nodeで依頼書の表を読み取り、新台本の最終行7件が完全一致することを確認。
- 新旧の台本・場面定義を比較し、各場面の秒数、最初の4行、音声の記載が同一であることを確認。
- 場面定義の変更は9/24・9/26・9/28キリドリの最終場面のtitle・captionだけで、依頼書と完全一致。
- HTML生成関数を実行し、35場面すべてで上部がアプリ名のみになり、日付・媒体名が含まれないことを確認。これは生成内容の確認であり、実際に描画した画像やMP4の目視確認ではない。
- 作成時のPowerShellからNodeへの文字コードの問題はUTF-8に固定して修正し、最終ファイルを上記の完全一致比較で検証した。

## 3. 動画生成を実行した結果

実行：

```powershell
node assets/issue5/video/render-videos-v2.cjs --id=20260924-tiktok-kiridori --output-suffix=-narrated-base-v2
```

ブラウザ起動段階で `TimeoutError: Timed out after waiting 30000ms` となり終了。新しいMP4・場面画像は生成されていない。

音声工程の実行環境も確認した：

- 既存Python `C:\Users\sdk_y\AppData\Local\Programs\Python\Python313\python.exe --version` の実行が「アクセスが拒否されました」で失敗。
- 既存VOICEVOX Nemo `C:\Users\sdk_y\Projects\VOICEVOX-Nemo\runtime\windows-cpu\run.exe --help` も、起動初期処理で `PermissionError: [WinError 5]`。必要な `C:\Users\sdk_y\AppData\Local\voicevox-nemo-engine` 配下へアクセスできず終了した。
- 既存接続先 `http://127.0.0.1:50121/version` に接続できないことは前工程で確認済み。
- 現在のシェルのPATHではPython・FFmpeg・FFprobeも見つからなかった。

このセッションは権限昇格を要求できない設定のため、権限変更・環境設定変更・別の音声サービスへの置き換えは行っていない。

## 4. 音声設定・尺の扱い

VOICEVOX Nemo 女声1・ノーマル、speaker 10005を維持する指示。既存音声生成処理には、話速1.07から場面ごとに最大1.35まで調整する処理、抑揚1.08、前後余白0.05/0.08秒、場面開始遅延0.12秒、全体音量調整がある。

`stage16-issue5-audio-check-and-workflow.md` にも記載されているとおり、旧版の場面ごとの最終話速は保存されていない。新しい台本をそのまま旧処理へ流すと話速が変わる可能性があるため、続行時は旧音声設定を検証して維持する必要がある。今回、音声の再生成・速度調整・尺の変更は行っていない。

**新しい最終行が既存の尺に収まるかは未測定。収まらなかった動画があるとも、すべて収まるとも断定できない。**

## 5. 対象7動画・投稿の現状

以下の秒数は台本の設計値であり、新版MP4の実測値ではない。

| post ID | 動画ID | 全体／最終場面 | 新版生成・media_urls更新 |
|---|---|---|---|
| ab4eca39-d95d-4c13-abc2-260fce04ecbb | 20260924-tiktok-kiridori | 26秒／5秒 | 未実施 |
| 2642df5a-028e-48b5-a195-a33bffa8d841 | 20260926-tiktok-kiridori | 27秒／4秒 | 未実施 |
| 73094f30-3485-497b-9037-752e465c29aa | 20260927-youtube-harinavi | 29秒／5秒 | 未実施 |
| 5aff942f-870e-416c-a60f-482f8341fc24 | 20260928-youtube-kiridori | 28秒／5秒 | 未実施 |
| ac0d7879-0b21-4d0b-b5a4-6803c5960968 | 20260927-tiktok-harinavi | 29秒／5秒 | 未実施 |
| 650ca82d-6d8f-4d5c-bf11-fb3d01805a01 | 20260930-youtube-kiridori | 28秒／6秒 | 未実施 |
| 1e205f81-96ed-4aee-b977-fa6c77e1bcb0 | 20260929-tiktok-harinavi | 29秒／6秒 | 未実施 |

7件の `media_urls` は変更前後で同一：各行の動画IDに対する `https://sns-material-storage.gbapp.workers.dev/issue5-<動画ID>-narrated.mp4` の1要素配列。完全IDとURLの対応を実DBで照合した。

X更新後の再取得でも、動画7投稿は全列不変。すべて `status=draft`、`readiness_state=needs_review`、`is_publishable=false`、`feature_published=false` を維持している。

## 6. 依頼された動画検証・公開URLの報告

- 新版のファイルサイズ・長さ・解像度・音声の有無：未生成のため未確認。
- 日付表示の削除と最終場面の文言：生成元と生成HTMLは確認済み。動画としての表示・文字の収まりは未確認。
- ローカル音声チェック `scripts/check-video-audio.py`：新版がなくPythonも実行不可のため未実施。合格扱いにしていない。
- 各動画の最初と最後の画像：未生成。
- `sns-material-storage` への `-v2` 配置：未実施。新しい公開URLは未発行で、HTTP状態・Content-Type・バイト数は未確認。
- 存在しないURLを登録しないため、7投稿の `media_urls` は旧URLのまま保持。

## 7. 変更ファイル・Git・未完了事項

今回の追加・更新は以下の3ファイルのみ。開始時から存在した未追跡ファイル5件は触っていない。

1. `assets/issue5/video/narration-v2.json`（追加）
2. `assets/issue5/video/render-videos-v2.cjs`（追加）
3. `stage24-tester-guidance-removal-20260926.md`（更新）

既存の追跡ファイルの差分なし。`git diff --check` 成功。コミット・プッシュ・GitHub設定変更は行っていない。Buffer・実際のSNSアカウント・sent投稿には触れておらず、ready化・予約・投稿も実施していない。

残作業は、既存Python・VOICEVOX Nemo・ブラウザ・FFmpegを実行できる環境での音声設定確認、音声付き生成処理の-v2対応、7本の生成、尺・画像・音声検証、-v2アップロード、HTTP検証、7投稿のmedia_urlsのみの差し替えと全列比較。X本文の差し替えは完了しているので再実施は不要。

## 8. Claude Code側で実施した残作業（2026-09-26 10:05〜10:11 JST）

### 8-1. 追加したファイル

- [render-narrated-videos-v2.py](assets/issue5/video/render-narrated-videos-v2.py)：既存 `render-narrated-videos.py` の複製。読み込み先を `narration-v2.json`・`render-videos-v2.cjs` に、出力を `<動画id>-narrated-v2.mp4` に変更。既存MP4を上書きする `--reuse-audio` 処理は削除。音声設定（speaker 10005、話速1.07から場面に収まるまで最大1.35へ自動調整、抑揚1.08、前後余白0.05/0.08秒、場面頭0.12秒遅延、loudnorm）は既存と同一。
- [render-videos-v2.cjs](assets/issue5/video/render-videos-v2.cjs)：ブラウザの場所を環境変数 `RENDER_BROWSER` で差し替えられるようにした（既定値は従来どおりEdge）。このPCのEdge（153.0.4234.32／.48の更新待ち）はheadless起動直後に終了したため、Chrome 153.0.8010.54で描画した。
- [apply-20260926-v2-media.js](apply-20260926-v2-media.js)：7投稿の `media_urls` だけを差し替えるスクリプト。対象IDの前方一致1件・`status=draft`・`external_post_id` なし・現在値が旧URL1件、をすべて満たすときだけ更新。既定はdry-run。

### 8-2. 生成

- VOICEVOX Nemo 0.24.0（`Projects/VOICEVOX-Nemo/runtime/windows-cpu/run.exe`、127.0.0.1:50121）をローカル起動。作業後に停止。
- 新しい最終行は、7本とも既存の場面秒数に収まった（場面を延ばしていない）。最終行の実測：9/24 4.54/5秒、9/26 2.71/4秒、9/27 TikTok 2.82/5秒、9/27 YouTube 4.57/5秒、9/28 4.26/5秒、9/29 4.81/6秒、9/30 3.37/6秒。すべて話速1.07。
- 出力7本：すべて720×1280・H.264・AAC音声あり。長さは26／27／29／29／28／29／28秒で旧版と同じ。平均音量 −17.4〜−18.0 dB、最大 −1.4〜−1.5 dB。
- 各動画の最初と最後のコマを目視：上部はアプリ名（キリドリ／ハリナビ）だけで、日付・媒体名は消えている。キリドリ3本の最終場面は依頼書の文字（「材料ごとの切り方を図で確認／キリドリは公開に向けて開発中」など）。ハリナビ3本と9/30キリドリの最終場面は旧版と同じ文字。
- `scripts/check-video-audio.py`（文字起こしによる確認）は、faster-whisper が未導入のため未実施。人による試聴も未実施。

### 8-3. 公開配置

`upload-to-public-url.js` で `sns-material-storage` に `issue5-<動画id>-narrated-v2.mp4` として7本を配置（事前に同名が404で未使用なことを確認。旧ファイルは残している）。公開URLから取得したファイルは7本ともHTTP 200・`video/mp4`・バイト数とSHA-256が手元と一致。HEADも200で `Content-Length` を返す。

### 8-4. DB（sns.posts）

`node apply-20260926-v2-media.js`（dry-run）で対象7件と変更内容を確認後、`--apply` で1トランザクション更新。変更は `media_urls` とDBが自動更新する `updated_at`（2026-09-26T01:11:19Z）だけ。更新後の再読み取りで、7件とも `status=draft`・`readiness_state=needs_review`・`is_publishable=false`・`feature_published=false`・`external_post_id=null` のまま。

| post ID | 新しい media_urls |
|---|---|
| ab4eca39 | issue5-20260924-tiktok-kiridori-narrated-v2.mp4 |
| 2642df5a | issue5-20260926-tiktok-kiridori-narrated-v2.mp4 |
| 73094f30 | issue5-20260927-youtube-harinavi-narrated-v2.mp4 |
| 5aff942f | issue5-20260928-youtube-kiridori-narrated-v2.mp4 |
| ac0d7879 | issue5-20260927-tiktok-harinavi-narrated-v2.mp4 |
| 650ca82d | issue5-20260930-youtube-kiridori-narrated-v2.mp4 |
| 1e205f81 | issue5-20260929-tiktok-harinavi-narrated-v2.mp4 |

ready化・予約・投稿・Buffer操作はしていない。投稿済み（sent）の投稿、10月分の動画、Instagram画像には触れていない。
