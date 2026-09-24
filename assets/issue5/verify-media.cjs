// Read-only checks for Issue #5 review assets. Requires ffprobe and ffmpeg on PATH.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = __dirname;
const instagram = path.join(root, 'instagram');
const video = path.join(root, 'video');
const pngs = fs.readdirSync(instagram).filter((name) => /^202609\d{2}_instagram_0[1-5]\.png$/.test(name));
assert.equal(pngs.length, 25, 'Instagram must have 5 × 5 images');
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
const mp4s = fs.readdirSync(video).filter((name) => /^202609\d{2}-(?:tiktok|youtube)-.+\.mp4$/.test(name));
assert.equal(mp4s.length, ids.length, 'There must be exactly eight review videos');
for (const id of ids) {
  const file = path.join(video, `${id}.mp4`);
  const data = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_entries',
    'format=duration:stream=codec_name,width,height,avg_frame_rate','-of','json',file], { encoding:'utf8' }));
  const picture = data.streams.find((stream) => stream.width);
  assert.deepEqual([picture.codec_name,picture.width,picture.height,picture.avg_frame_rate],
    ['h264',720,1280,'24/1'], id);
  assert.ok(data.streams.some((stream) => stream.codec_name === 'aac'), `${id}: audio track missing`);
  assert.ok(Number(data.format.duration) >= 26 && Number(data.format.duration) <= 29.1,
    `${id}: duration ${data.format.duration}`);
  const frameHash = (second) => execFileSync('ffmpeg', ['-v','error','-ss',String(second),
    '-i',file,'-frames:v','1','-f','md5','-'], { encoding:'utf8' }).trim();
  assert.notEqual(frameHash(0.25), frameHash(1.75), `${id}: opening two seconds are static`);
}
console.log('Issue #5 media verified: 25 Instagram PNGs and 8 moving MP4s');
