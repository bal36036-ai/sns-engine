// Read-only checks for Issue #5 review assets. Requires ffprobe and ffmpeg on PATH.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const root = __dirname;
const instagram = path.join(root, 'instagram');
const video = path.join(root, 'video');
const videoOnly = process.argv.includes('--video-only');
const pngs = videoOnly ? [] : fs.readdirSync(instagram).filter((name) => /^202609\d{2}_instagram_0[1-5]\.png$/.test(name));
if (!videoOnly) {
assert.equal(pngs.length, 25, 'Instagram must have 5 × 5 images');
}
for (const name of pngs) {
  const data = JSON.parse(execFileSync('ffprobe', ['-v','error','-select_streams','v:0',
    '-show_entries','stream=width,height','-of','json',path.join(instagram, name)], { encoding:'utf8' }));
  assert.deepEqual([data.streams[0].width, data.streams[0].height], [1080,1350], name);
}

const ids = [
  '20260924-tiktok-kiridori', '20260925-youtube-harinavi',
  '20260926-tiktok-kiridori', '20260927-tiktok-harinavi',
  '20260927-youtube-harinavi', '20260928-youtube-kiridori',
  '20260929-tiktok-harinavi', '20260930-youtube-kiridori'
];
const narration = require('./video/narration.json');
const publication = require('./video/publication-copy.json');
const { FIRST_WEEK } = require('../../first-week-content');
assert.deepEqual(publication.posts.map(post => post.id), ids, 'One caption per video');
for (const post of publication.posts) {
  assert.equal(post.video, `${post.id}-narrated.mp4`);
  assert.equal((post.text.match(/音声：VOICEVOX Nemo/g) || []).length, 1, `${post.id}: missing/duplicate credit`);
  assert.ok(post.text.startsWith(FIRST_WEEK[post.date][post.platform].bodyText), `${post.id}: original caption changed`);
  assert.ok(post.text.includes('例'), `${post.id}: illustrative numbers must be identified in caption`);
  if (post.id.endsWith('harinavi')) assert.ok(post.text.includes('専門家'), `${post.id}: safety note missing`);
}
const baseline = process.argv.find(arg => arg.startsWith('--audio-baseline='))?.slice(17);
const results = [];
assert.deepEqual(narration.videos.map((item) => item.id), ids, 'Narration must cover each review video');
for (const item of narration.videos) {
  assert.equal(item.lines.length, 5, `${item.id}: expected five narration scenes`);
  assert.equal(item.seconds.length, 5, `${item.id}: expected five scene durations`);
}
const mp4s = fs.readdirSync(video).filter((name) => /^202609\d{2}-(?:tiktok|youtube)-.+\.mp4$/.test(name));
assert.equal(mp4s.length, ids.length * 2, 'Keep eight silent drafts and eight narrated review videos');
for (const id of ids) {
  const file = path.join(video, `${id}-narrated.mp4`);
  const data = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_entries',
    'format=duration:stream=codec_name,width,height,avg_frame_rate','-of','json',file], { encoding:'utf8' }));
  const picture = data.streams.find((stream) => stream.width);
  assert.deepEqual([picture.codec_name,picture.width,picture.height,picture.avg_frame_rate],
    ['h264',720,1280,'24/1'], id);
  assert.ok(data.streams.some((stream) => stream.codec_name === 'aac'), `${id}: audio track missing`);
  assert.ok(Number(data.format.duration) >= 26 && Number(data.format.duration) <= 29.1,
    `${id}: duration ${data.format.duration}`);
  assert.ok(Math.abs(Number(data.format.duration) - narration.videos.find(item => item.id === id).seconds.reduce((a,b) => a+b, 0)) < 0.1,
    `${id}: duration no longer matches narration`);
  // Sample decoded pixels after each short scene fade. Lossy encoding can produce
  // tiny differences, but a moving screenshot produces a much larger difference.
  const frame = second => execFileSync('ffmpeg', ['-v','error','-ss',String(second),
    '-i',file,'-frames:v','1','-vf','scale=360:640','-pix_fmt','rgb24','-f','rawvideo','-'], { maxBuffer: 2 * 1024 * 1024 });
  const meanDifference = (a, b) => {
    assert.equal(a.length, b.length);
    return a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
  };
  let start = 0;
  const scenes = [];
  for (const seconds of narration.videos.find(item => item.id === id).seconds) {
    const first = frame(start + 0.5);
    const last = frame(start + seconds - 0.5);
    const difference = meanDifference(first, last);
    assert.ok(difference < 0.25, `${id} @${start}s: screen moved (${difference})`);
    const background = id.endsWith('harinavi') ? [238,244,247] : [255,245,236];
    // The screenshot card's shadow can extend below y=1200; the last 40px
    // (20px in this half-size sample) are the actual clear bottom margin.
    const bottom = first.subarray(360 * 620 * 3);
    const bottomError = bottom.reduce((sum, value, i) => sum + Math.abs(value - background[i % 3]), 0) / bottom.length;
    // YUV compression shifts the whole cream background by up to 3 RGB levels.
    // Check spatial uniformity separately so that the tolerance cannot hide text.
    const bottomVariation = bottom.reduce((sum, value, i) => sum + Math.abs(value - bottom[i % 3]), 0) / bottom.length;
    assert.ok(bottomError < 4 && bottomVariation < 1, `${id} @${start}s: bottom strip is not clear (${bottomError}, ${bottomVariation})`);
    scenes.push({ start, seconds, static_mean_pixel_difference: difference, footer_mean_pixel_error: bottomError, footer_spatial_variation: bottomVariation });
    start += seconds;
  }
  const audioHash = execFileSync('ffmpeg', ['-v','error','-i',file,'-map','0:a:0','-c','copy','-f','md5','-'], { encoding:'utf8' }).trim();
  if (baseline) {
    const previous = execFileSync('git', ['show', `${baseline}:assets/issue5/video/${id}-narrated.mp4`], { maxBuffer: 32 * 1024 * 1024 });
    const oldHash = execFileSync('ffmpeg', ['-v','error','-i','pipe:0','-map','0:a:0','-c','copy','-f','md5','-'], { input: previous, encoding:'utf8' }).trim();
    assert.equal(audioHash, oldHash, `${id}: narration changed`);
  }
  const decoded = spawnSync('ffmpeg', ['-hide_banner','-nostats','-i',file,'-vn','-af','volumedetect',
    '-f','null','-'], { encoding:'utf8' });
  assert.equal(decoded.status, 0, `${id}: audio cannot be decoded`);
  const level = Number(decoded.stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1]);
  assert.ok(Number.isFinite(level) && level > -40, `${id}: narration is silent or too quiet (${level} dB)`);
  results.push({ id, duration: Number(data.format.duration), audio_hash: audioHash, audio_max_db: level, scenes });
}
const report = process.argv.find(arg => arg.startsWith('--report='))?.slice(9);
if (report) fs.writeFileSync(report, JSON.stringify({ checked_at: new Date().toISOString(), audio_baseline: baseline || null,
  videos: results, publication_captions: publication.posts.length, result: 'passed' }, null, 2) + '\n');
console.log(`Issue #5 media verified: ${pngs.length} Instagram PNGs, 8 silent drafts, 8 fixed-screen narrated MP4s, 40 static scenes, 8 credited captions`);
