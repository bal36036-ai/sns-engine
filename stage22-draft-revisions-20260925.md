# 2026-09-25 下書き修正結果

Supabase `dvysbebkzvvqyqtlgqcx` の `sns.posts` を更新。反映・再取得検証完了: 2026-09-25T03:33:59.989Z。
フォロー訴求121件、質問文11件、legacy差し替え3件。質問11件はフォロー訴求に含むため、実更新は124投稿。

依頼元: リポジトリの親フォルダー `SNS集客/Codex依頼_下書き修正案_20260925.md`。
元本文・新本文の全件記録: [draft-revisions-20260925.json](draft-revisions-20260925.json)。
今回はDBの既存下書きだけを修正し、将来の下書き生成ロジックは変更していない。

## 対象と不一致

- 依頼178投稿に対し、実データのcal-は147投稿（62 topic_id）。31投稿不足。依頼には178件分のID一覧がないため、不足31件の個別IDは特定できない。既存の147件を基準とした。
- 質問文は依頼見出し14件に対し、記載IDは13件。13件とも実在し、topic_id・アプリ・タイトル・質問符なしの条件は一致。14件という抽出件数には、明示除外の `11c35ddc-757f-4ba0-8673-8d5bd910584a` が含まれる。同投稿には質問文を追加せず、依頼1のフォロー訴求のみ追加した。
- ユーザーの追加指示でwaiting_channelのcal-全26件は変更対象外。よってフォロー追記は147−26＝121件。
- 質問対象のX 2件もwaiting_channelのため変更しなかった: `ec98053d-cf89-4698-bb4c-680581f1af19`（cal-20261001-a）、`949e3aa4-8751-4c0c-9ea8-9414735514b6`（cal-20261021-a）。質問追加は13−2＝11件。
- legacy 3件はID・媒体・元文面・下書き状態が一致。明示された3件はすべて更新（うちX 1件のみwaiting_channel）。
- フォローA/B/Cは実在する62 topic_idの辞書順でローテーション。同一topic_idの更新対象には同じパターンを適用。リンク追加なし。
- ハッシュタグの前に追記。タグ以降の既存文面（VOICEVOX Nemoの音声クレジット等）もそのまま保持。
- 更新は `body_text` のみをSET。既存トリガーによる `updated_at` 自動更新はユーザー承認済み。スキーマやトリガーは変更していない。

## 検証

- 全184投稿を更新前後にSupabaseから取得。124件の本文が予定値と完全一致。対象外60件は本文・更新日時とも不変。
- 全184件で本文・更新日時を除く全カラムの行ハッシュが一致。status、readiness_state、scheduled_at、公開可否、素材等は不変。更新124件はすべてdraft。
- 更新直前に行ロックし、元本文・draft状態・他カラムのハッシュを照合。単一トランザクションで124件を更新し、件数と他カラム不変を再検証。
- 全124件のローカル検査: 指定文面との一致、追記部分を除いた原文の保持、追加文の重複なし、リンク追加なし、topic_id別パターン統一を確認。
- ローカル検査の初回は検査コードの改行除去条件が誤り、タグ直前に追加した区切り改行を除去できず失敗。検査条件を修正して全124件成功。DB本文の再修正は不要だった。
- `node --test test-calendar.js test-issue5.js test-issue5-review.js test-issue5-remaining.js test-reschedule-calendar.js`: 16件成功、0件失敗。
- 公開dashboard-dataの直接取得はこの環境から失敗したため、検証はSupabase再取得による。
- 新規2ファイルに対する `git diff --no-index --check` は問題なし。

## Git

作業開始時のローカルHEADとGitHub mainは `87717a02d9df69aba85e7b43331c6bbb68aade6e` で一致。
既存の未追跡Day10作業ファイル5件は変更・登録しない。
ローカル.gitへの書き込みは環境権限で拒否、シェルからGitHubへの通信も失敗。
GitHub接続ツールからmainを読み取ることはできたが、新規2ファイルのツリー作成は `MCP tool call requires approval, but approval policy is never` で拒否された。このためコミットは未作成、pushも未実行。変更コミットハッシュはない。ローカルとリモートの最終確認HEADは上記の旧HEADのまま。報告書と全件本文記録はローカルに保存済み。

## フォロー訴求追加: 121件

| post id | topic_id | SNS | パターン |
|---|---|---|---|
| 562b701f-ba68-48ff-9e7d-fbea50b0c0bb | cal-20260924-a | instagram | A |
| 54c748e6-33d4-4dec-9d00-b05dc39b2baa | cal-20260924-a | threads | A |
| ab4eca39-d95d-4c13-abc2-260fce04ecbb | cal-20260924-a | tiktok | A |
| b3ffb0f8-269e-4f22-a0b7-b6166e742eba | cal-20260924-b | threads | B |
| d0c23464-396f-4b9c-8be1-2c9b183b9d3b | cal-20260925-a | threads | C |
| 6ebb387d-e257-495d-9974-76b9fea50e99 | cal-20260925-a | youtube | C |
| 1c7f7a47-8cd7-410f-bc88-42b72bf696db | cal-20260926-a | threads | A |
| 2642df5a-028e-48b5-a195-a33bffa8d841 | cal-20260926-a | tiktok | A |
| aa0598b5-ff56-4c36-8ce4-013c54a4eed7 | cal-20260926-b | threads | B |
| 281b2249-f36f-4e2e-9e14-cfd02074cb9a | cal-20260927-a | instagram | C |
| 35bd8590-25fd-48f8-bcf2-4f5ed035990e | cal-20260927-a | threads | C |
| ac0d7879-0b21-4d0b-b5a4-6803c5960968 | cal-20260927-a | tiktok | C |
| 73094f30-3485-497b-9037-752e465c29aa | cal-20260927-a | youtube | C |
| fd0eb894-9f50-4e02-b693-8fc31f99144d | cal-20260928-a | instagram | A |
| 8abd970e-e7d6-4382-89b2-2807b448242d | cal-20260928-a | threads | A |
| 5aff942f-870e-416c-a60f-482f8341fc24 | cal-20260928-a | youtube | A |
| a727c0be-8463-4a61-b2af-70393dda131b | cal-20260928-b | threads | B |
| 45538d66-284e-48d3-844c-fb2f4c86a77e | cal-20260929-a | instagram | C |
| 5f4cdac9-207d-4bf4-9b2f-f1eea09e13aa | cal-20260929-a | threads | C |
| 1e205f81-96ed-4aee-b977-fa6c77e1bcb0 | cal-20260929-a | tiktok | C |
| 5cade5a3-52b4-4d27-8e41-2cd63e70255a | cal-20260929-b | threads | A |
| 706edf95-960b-4d47-9203-4a2128d55181 | cal-20260930-a | instagram | B |
| a403a76c-4f0a-4bd9-8244-8b3beb9aef88 | cal-20260930-a | threads | B |
| 650ca82d-6d8f-4d5c-bf11-fb3d01805a01 | cal-20260930-a | youtube | B |
| 815bec60-93f8-4cff-a56e-38a02d133df8 | cal-20260930-b | threads | C |
| 45d435f2-93d3-4071-852e-4589e5ab3675 | cal-20261001-a | instagram | A |
| 2b01b67f-522b-4ac2-b838-571efae92c0c | cal-20261001-a | threads | A |
| 683ebc74-f518-4f10-8f99-15e92fd2f0f8 | cal-20261001-a | tiktok | A |
| 11c35ddc-757f-4ba0-8673-8d5bd910584a | cal-20261001-b | threads | B |
| b087c763-6861-4250-8895-a203c093a7bf | cal-20261002-a | threads | C |
| e10de7e7-c530-463b-9602-ebae1d71b47f | cal-20261002-a | youtube | C |
| 35f7ef20-9809-458f-a138-edccf1e7444a | cal-20261002-b | threads | A |
| 84934744-89bd-4823-b72c-d4d93b9cd314 | cal-20261003-a | threads | B |
| 1529880b-5d23-42f3-bcba-ee07852bc96d | cal-20261003-a | tiktok | B |
| 7835348b-9b3e-4faa-87ac-38f11fbf5245 | cal-20261003-b | threads | C |
| f791d316-40d2-473b-9ee7-01e040cce070 | cal-20261004-a | instagram | A |
| 16164284-5b85-4485-9eb1-878c8ae5d4a2 | cal-20261004-a | threads | A |
| 702b679d-08fb-4632-981e-7bd2b67fe5b3 | cal-20261004-a | tiktok | A |
| 83097c71-2a73-4482-9c1e-589e69bd83e9 | cal-20261004-a | youtube | A |
| 066c7311-01c6-4277-b21f-54d6c2abd803 | cal-20261004-b | threads | B |
| 95632c62-5d2e-40e7-a28a-c50dfa2e82e6 | cal-20261005-a | instagram | C |
| 0d120325-3ad8-4fd2-9160-8497fdb36b82 | cal-20261005-a | threads | C |
| 5e56eb57-3f77-4275-afba-bf56688d0b80 | cal-20261005-a | youtube | C |
| 06503fed-c60f-4dbf-8100-bb507fba6353 | cal-20261005-b | threads | A |
| 36ee7cff-8074-47f4-a4b9-57ee32de35b2 | cal-20261006-a | instagram | B |
| 1a434f32-beda-493d-8a99-27ce59d525c2 | cal-20261006-a | threads | B |
| f7413088-b4f7-4edc-9edc-3aed7cf384e3 | cal-20261006-a | tiktok | B |
| a450ecd6-b927-4efd-ba09-525ec64cfbee | cal-20261006-b | threads | C |
| 7782639b-0402-4eeb-82ee-986378abb5fa | cal-20261007-a | instagram | A |
| 5c2ac479-b5b4-4566-a688-8a6fed985e53 | cal-20261007-a | threads | A |
| 1bda024c-afd3-4f1b-ae1f-49adac5eb3b1 | cal-20261007-a | youtube | A |
| fba8a09e-3048-448e-a8b5-6512c96aaaf2 | cal-20261007-b | threads | B |
| 0c6823ff-4938-45e5-88ec-6b4df66213a8 | cal-20261008-a | instagram | C |
| db964145-1b1a-455e-8a82-de2560765ccc | cal-20261008-a | threads | C |
| f417b312-2cbb-43c2-97d1-e2a7ed033d7e | cal-20261008-a | tiktok | C |
| ed7eecc2-2d47-4063-97b8-f77fcac54d8b | cal-20261008-b | threads | A |
| a5e2d3e9-556b-485b-8d67-a7f2c37cec33 | cal-20261009-a | threads | B |
| f5ece66d-0def-4c90-99df-c4a78f6a25ac | cal-20261009-a | youtube | B |
| f30aa544-cfb6-44c2-a19f-68acb519d0f0 | cal-20261009-b | threads | C |
| e4100f73-10a0-4828-96aa-aaa50c2f6db7 | cal-20261010-a | threads | A |
| 57bdf46d-73b6-4ef1-89c1-f63695a4dad0 | cal-20261010-a | tiktok | A |
| def26265-bd0b-4a14-a857-723670ce0bf9 | cal-20261010-b | threads | B |
| 3dff8817-68f0-4547-bd25-fe3ed32fc67a | cal-20261011-a | instagram | C |
| 540d1c68-ad57-4492-8baa-871ba1cc9e4f | cal-20261011-a | threads | C |
| 7e130a51-2525-4237-a23c-b83a4797e247 | cal-20261011-a | tiktok | C |
| 15adcec0-555f-45be-abf8-6d4295450611 | cal-20261011-a | youtube | C |
| 8aa21820-ee59-4c52-8345-69cee7e390c5 | cal-20261011-b | threads | A |
| 29a1c16f-1f93-469d-8b08-966b7d2a629f | cal-20261012-a | instagram | B |
| 1c1198c7-dc80-462f-b387-a1a53491bde1 | cal-20261012-a | threads | B |
| 0ac994e2-bcad-4165-98a2-02afb38f5f35 | cal-20261012-a | youtube | B |
| c165c1db-f612-41ea-adcd-19f50bbe62db | cal-20261012-b | threads | C |
| 27089211-f88a-4324-b8f6-ce98bd818b39 | cal-20261013-a | instagram | A |
| 6bf84f6a-07fb-42fc-ad23-2cdaf6584e3a | cal-20261013-a | threads | A |
| a4055ef4-b6e8-488a-af24-c9fed8a1e131 | cal-20261013-a | tiktok | A |
| 44aaf0a1-8524-4588-b21e-5c0528d68e93 | cal-20261013-b | threads | B |
| 8f58d801-909f-49c8-bdb5-70fae74a553f | cal-20261014-a | instagram | C |
| e2c9123c-da1a-41de-9b10-a0e39d0862ed | cal-20261014-a | threads | C |
| 09ae193f-e794-497c-9440-7506d57c9977 | cal-20261014-a | youtube | C |
| ee1b4151-c929-4c25-9ff7-cc59c35afa6e | cal-20261014-b | threads | A |
| a1332d18-d90f-4ae3-8fbd-353189d2143c | cal-20261015-a | instagram | B |
| a114d6ce-fce8-4d5b-ba39-04aa050af730 | cal-20261015-a | threads | B |
| 73da6d93-3180-4935-9336-0d95ad5b00a3 | cal-20261015-a | tiktok | B |
| 5998e976-287c-4fe2-817d-3a4246bdcdfd | cal-20261015-b | threads | C |
| 4854af83-33ef-470b-b86e-89ceb2ee5369 | cal-20261016-a | threads | A |
| 2b0fac09-42b2-41c2-9152-325956afcf82 | cal-20261016-a | youtube | A |
| a7c2bdc4-26b9-4eda-a890-59c970e0bfbb | cal-20261016-b | threads | B |
| 999dac94-9b7d-4a68-a077-7d48562512f6 | cal-20261017-a | threads | C |
| 0cb2699f-4480-4954-a820-b58d4bb5d686 | cal-20261017-a | tiktok | C |
| 98a9c343-02e3-4a77-8b07-cee549c6f225 | cal-20261017-b | threads | A |
| 684c66d0-5982-4132-b421-c0805f625179 | cal-20261018-a | instagram | B |
| c31fbbd4-707d-4af0-b660-1f937c49aab1 | cal-20261018-a | threads | B |
| 7d68482a-b527-43ff-b16c-67c08652d964 | cal-20261018-a | tiktok | B |
| 8022be0b-c3e9-45c8-806b-030145614d36 | cal-20261018-a | youtube | B |
| 3ea0b1bd-67cc-41f7-9d9c-3938410c0d33 | cal-20261018-b | threads | C |
| 27fa762b-0c90-42f5-ace9-809d1988f1d4 | cal-20261019-a | instagram | A |
| dbb6e4da-4d37-4283-892a-c1cf71fdd640 | cal-20261019-a | threads | A |
| f4853e5c-ca2e-4861-8525-00d68e00c55b | cal-20261019-a | youtube | A |
| d36c4924-0f69-4ffa-8193-79104ba8c650 | cal-20261019-b | threads | B |
| 4450f01f-a66f-4e72-bd05-d285ea93d891 | cal-20261020-a | instagram | C |
| 187ae080-3edd-46ad-942f-c8a80ed91eb2 | cal-20261020-a | threads | C |
| 4fe9df1a-48fd-4ac1-b570-f7afd48f5b33 | cal-20261020-a | tiktok | C |
| 2193c2c8-4fb7-456a-86bd-f3af0ebe7881 | cal-20261020-b | threads | A |
| 51a098e8-b18d-4717-80af-899697c5505b | cal-20261021-a | instagram | B |
| 9c159ab5-9733-4e8d-86f1-cc6b6659c9a0 | cal-20261021-a | threads | B |
| 47e016be-bb7d-4c16-969c-e4eff7cf2cee | cal-20261021-a | youtube | B |
| b4d206a9-12f7-48e6-8d89-202dfff87757 | cal-20261021-b | threads | C |
| ad571eda-be19-448a-be05-4ed5cc0c2b07 | cal-20261022-a | instagram | A |
| 7394cc1d-e89b-4197-b5ea-0a3e46b35670 | cal-20261022-a | threads | A |
| 169739f2-3eac-43b6-baf9-389b45fece23 | cal-20261022-a | tiktok | A |
| 4458acc7-0705-46fb-9aca-0e10b0e1cfc2 | cal-20261022-b | threads | B |
| 519ca592-8b3f-4ec9-b438-bd02a89d2119 | cal-20261023-a | threads | C |
| ec6eee39-1468-425a-b380-1ff123912337 | cal-20261023-a | youtube | C |
| 00f368a5-cbab-4ad0-80f1-c456e67e804d | cal-20261023-b | threads | A |
| a7b4440e-ee0a-4767-be3e-8a16db23de92 | cal-20261024-a | threads | B |
| 3d8d0dba-80ea-48c6-b44b-fd4026c4f4f5 | cal-20261024-a | tiktok | B |
| 778cfb88-c980-4c9c-81c2-963d2688dddc | cal-20261024-b | threads | C |
| 4ec2844a-8fc1-4574-a0eb-10407197cfd8 | cal-20261025-a | instagram | A |
| d5a94998-4220-4bd1-bde6-0693506441c3 | cal-20261025-a | threads | A |
| 49c8ca65-f158-449e-a4e5-eec3cc397b3d | cal-20261025-a | tiktok | A |
| 63fc2fac-63b6-4187-87af-8e2b7decc0ec | cal-20261025-a | youtube | A |
| 147b5b71-4757-42e9-93b2-a2edec194b31 | cal-20261025-b | threads | B |

代表差分:

```diff
-材料の長さを拾っているうちに、頭の中ではもう「どの定尺から切るか」が始まっている。材料取りって、数える作業と組み合わせを考える作業が同時に来ますよね。キリドリでは、その考える部分を画面で見返せるようにしています。
+材料の長さを拾っているうちに、頭の中ではもう「どの定尺から切るか」が始まっている。材料取りって、数える作業と組み合わせを考える作業が同時に来ますよね。キリドリでは、その考える部分を画面で見返せるようにしています。
+
+アプリストア公開に向けて開発中です。フォローしてお待ちください。
```

## 質問文追加: 11件

| post id | topic_id | SNS | パターン |
|---|---|---|---|
| 45d435f2-93d3-4071-852e-4589e5ab3675 | cal-20261001-a | instagram | A |
| 2b01b67f-522b-4ac2-b838-571efae92c0c | cal-20261001-a | threads | A |
| 683ebc74-f518-4f10-8f99-15e92fd2f0f8 | cal-20261001-a | tiktok | A |
| 3dff8817-68f0-4547-bd25-fe3ed32fc67a | cal-20261011-a | instagram | C |
| 540d1c68-ad57-4492-8baa-871ba1cc9e4f | cal-20261011-a | threads | C |
| 7e130a51-2525-4237-a23c-b83a4797e247 | cal-20261011-a | tiktok | C |
| 15adcec0-555f-45be-abf8-6d4295450611 | cal-20261011-a | youtube | C |
| 51a098e8-b18d-4717-80af-899697c5505b | cal-20261021-a | instagram | B |
| 9c159ab5-9733-4e8d-86f1-cc6b6659c9a0 | cal-20261021-a | threads | B |
| 47e016be-bb7d-4c16-969c-e4eff7cf2cee | cal-20261021-a | youtube | B |
| b4d206a9-12f7-48e6-8d89-202dfff87757 | cal-20261021-b | threads | C |

代表差分（同時にフォロー訴求も追記）:

```diff
-梁を確認する前に、荷重や支持の条件をどこに書いたか探すところから始まることがあります。ハリナビの画面を考えるときも、結果より先に「何を条件として入れたか」を追えることを大切にしています。
+梁を確認する前に、荷重や支持の条件をどこに書いたか探すところから始まることがあります。ハリナビの画面を考えるときも、結果より先に「何を条件として入れたか」を追えることを大切にしています。
+
+アプリストア公開に向けて開発中です。フォローしてお待ちください。
+
+確認前に必ずそろえる情報があれば教えてください。
```

## legacy文面差し替え: 3件（全件diff）

### 7bc87fa8-eb55-40d8-8139-0898ebaa903d (threads)

```diff
-2週間、材料取りアプリ「キリドリ」の話をしてきました。
-最後に聞きたいです。材料取りで一番面倒なのって、①組み合わせを考える／②本数の見積り／③端材の管理／④指示書づくり、どれですか？（それ以外でも）
-「試してみてもいい」という方がいれば、テスターを少しずつ募集します。コメントかDMでどうぞ（開発中・今は無料でお試しいただけます）。
+2週間、材料取りアプリ「キリドリ」の話をしてきました。最後に聞きたいです。材料取りで一番面倒なのって、①組み合わせを考える／②本数の見積り／③端材の管理／④指示書づくり、どれですか？（それ以外でも）コメントで教えてもらえると、開発の参考にします。アプリストア公開に向けて開発中です。フォローして見守ってください。
```

### 3adb4308-acd0-4248-b29f-0af6f4472614 (threads)

```diff
-加工の指示って、現場だと紙で渡すことが多いですか、それともデータでしょうか。
-「キリドリ」はPDFとExcelの両方で出せるようにしていて、なぜ両方なのかをnoteにまとめました。
-（リンク）
+加工の指示って、現場だと紙で渡すことが多いですか、それともデータでしょうか。「キリドリ」はPDFとExcelの両方で出せるようにしています。現場に渡す人と、記録として残したい人、両方に対応したくて両方つけました。
```

### 408d6244-55f6-4653-8f9e-309316a7b6e5 (x)

```diff
-加工の指示、現場だと紙で渡すこと多いですか、それともデータ？
-「キリドリ」はPDFとExcelの両方で出せるようにしています。その理由をnoteに書きました。
-（リンク）
+加工の指示、現場だと紙で渡すこと多いですか、それともデータ？「キリドリ」はPDFとExcelの両方で出せるようにしています。渡す相手によって欲しい形が違うので、両方用意しました。
```
