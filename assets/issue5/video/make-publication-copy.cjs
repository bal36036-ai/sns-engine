// Review-only final captions for the eight videos. Does not connect to any service.
const fs = require('node:fs');
const path = require('node:path');
const { FIRST_WEEK } = require('../../../first-week-content');
const { videos } = require('./narration.json');

const posts = videos.map(({ id }) => {
  const [stamp, platform, app] = id.split('-');
  const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6)}`;
  const original = FIRST_WEEK[date][platform];
  let text = original.bodyText;
  if (app === 'harinavi' && !text.includes('専門家')) {
    text += '\n\n安全の最終判断は、条件を確認した専門家が行います。';
  }
  text += '\n\n音声：VOICEVOX Nemo';
  return { id, date, platform, topic_id: `cal-${stamp}-a`,
    video: `${id}-narrated.mp4`,
    placement: platform === 'youtube' ? '概要欄' : '投稿本文・キャプション',
    ...(original.plan.title ? { title: original.plan.title } : {}), text };
});
const result = {
  state: 'review_only_not_applied_to_database',
  instruction: 'https://github.com/bal36036-ai/sns-engine/issues/5#issuecomment-5815904217',
  credit: '音声：VOICEVOX Nemo',
  posts
};
fs.writeFileSync(path.join(__dirname, 'publication-copy.json'), JSON.stringify(result, null, 2) + '\n');
const markdown = ['# 動画8本の投稿本文・概要欄（再確認待ち）', '',
  '動画内から移した音声クレジットと安全注意を含む原稿。投稿・予約時には動画とこの原稿をセットで扱う。DB・Buffer・SNSには未反映。', '',
  '音声：VOICEVOX Nemo。女声1・ノーマル（10005）。BGM・効果音なし。', '',
  '既存本文を基に、8件に音声クレジットを追加。9/25 YouTubeには専門家による最終判断の一文も追加。他のハリナビ3件は既存の安全注意を維持。', '',
  ...posts.flatMap(post => [`## ${post.date} ${post.platform}／${post.topic_id}`, '',
    `[修正後の動画](${post.video}) ｜ 記載先：${post.placement}`, '',
    ...(post.title ? [`タイトル：${post.title}`, ''] : []),
    '```text', post.text, '```', ''])];
fs.writeFileSync(path.join(__dirname, 'publication-copy.md'), markdown.join('\n'));
console.log(`Prepared ${posts.length} review captions with VOICEVOX Nemo credit; no DB/API calls`);
