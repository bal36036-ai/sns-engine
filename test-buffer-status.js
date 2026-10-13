const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({ createdStatus = 'sending', duplicate = null, remote, lookupError } = {}) {
  const row = {
    id: '632d3f47-d0a5-43f2-a49a-a2a99792662d', target_sns: 'youtube', title: 'Test',
    body_text: 'Approved body', media_urls: ['https://example.test/video.mp4'],
    status: 'ready', scheduled_at: new Date().toISOString(), is_publishable: true,
    feature_published: true, duplicate_check: { result: 'none' },
    post_result: { failure_history: ['keep'], dry_run: true }, external_post_id: null,
  };
  let creates = 0;
  const queries = [];
  const client = { release() {}, async query(sql, values = []) {
    queries.push({ sql, values });
    if (sql.startsWith('UPDATE sns.posts SET post_result')) {
      assert.equal(values[2], row.external_post_id);
      row.post_result = { ...row.post_result, ...JSON.parse(values[1]) };
    }
    if (sql.startsWith('UPDATE sns.posts SET status')) {
      row.status = values[1];
      if (sql.includes('post_result =')) {
        const match = sql.match(/post_result = COALESCE\(post_result, '\{\}'::jsonb\) \|\| \$(\d+)/);
        row.post_result = { ...row.post_result, ...JSON.parse(values[Number(match[1]) - 1]) };
      }
      for (const key of ['external_service', 'external_post_id', 'error_detail', 'matched_external_link', 'matched_posted_at']) {
        const match = sql.match(new RegExp(`${key} = \\$(\\d+)`));
        if (match) row[key] = values[Number(match[1]) - 1];
      }
    }
    return { rows: [] };
  } };
  const exports = {};
  const context = {
    module: { exports }, exports, console, process: { env: {} }, Date,
    require(name) {
      if (name === 'https') return { request(url, options, done) {
        return { on() {}, end() { done({ statusCode: 200 }); } };
      } };
      if (name === './db-client') return { getPool() { return { connect: async () => client, end: async () => {} }; } };
      if (name === './threads-client') return {};
      if (name === './buffer-channels') return { CHANNEL_MAP: { youtube: 'channel-youtube', instagram: 'channel-instagram' }, ACTIVE_BUFFER_MAP: { youtube: 'channel-youtube' }, PAUSED_SNS: ['instagram'], TEXT_ONLY_SNS: [], AUTOMATED_SNS: ['youtube'] };
      if (name === './buffer-client') return {
        findDuplicatePost: async () => duplicate,
        createPost: async () => { creates++; return { id: 'buffer-123', status: createdStatus }; },
        getPost: async () => { if (lookupError) throw lookupError instanceof Error ? lookupError : new Error('Read unavailable'); return remote; },
      };
      throw new Error(`Unexpected require: ${name}`);
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'cron-engine.js'), 'utf8'), context);
  return { engine: context.module.exports, row, client, queries, creates: () => creates };
}

test('Buffer sending must remain unposted and preserve history', async () => {
  const s = setup();
  const result = await s.engine.processOne(s.client, s.row, { dryRun: false });
  assert.equal(s.row.status, 'ready');
  assert.equal(s.row.external_post_id, 'buffer-123');
  assert.equal(s.row.post_result.delivery_status, 'processing');
  assert.deepEqual(s.row.post_result.failure_history, ['keep']);
  assert.equal(result.result, 'processing');
  assert.equal(s.creates(), 1);
});

test('NOT_FOUND records unavailable separately without changing publication or history', async () => {
  const missing = Object.assign(new Error('Post not found'), { code: 'NOT_FOUND' });
  const s = setup({ lookupError: missing });
  Object.assign(s.row, { status: 'sent', external_service: 'buffer', external_post_id: 'buffer-123',
    error_detail: 'Original record', matched_external_link: 'https://www.instagram.com/p/existing/' });
  const result = await s.engine.syncBufferPost(s.client, s.row);
  assert.equal(result.lookup_status, 'not_found');
  assert.equal(s.row.status, 'sent');
  assert.equal(s.row.error_detail, 'Original record');
  assert.equal(s.row.matched_external_link, 'https://www.instagram.com/p/existing/');
  assert.equal(s.row.post_result.buffer_lookup.state, 'not_found');
  assert.equal(s.row.post_result.buffer_lookup.external_post_id, 'buffer-123');
  assert.deepEqual(s.row.post_result.failure_history, ['keep']);
  assert.equal(s.creates(), 0);
});

test('NOT_FOUND never promotes an unverified ready post to sent or failed', async () => {
  const s = setup({ lookupError: Object.assign(new Error('Post not found'), { code: 'NOT_FOUND' }) });
  Object.assign(s.row, { external_service: 'buffer', external_post_id: 'buffer-123' });
  await s.engine.syncBufferPost(s.client, s.row);
  assert.equal(s.row.status, 'ready');
  assert.equal(s.row.post_result.buffer_lookup.state, 'not_found');
  assert.equal(s.creates(), 0);
});

test('only old paused channel references get a 24 hour recheck interval', async () => {
  for (const [sns, registeredAt, deferred] of [
    ['instagram', '2026-09-22T10:35:39Z', true],
    ['instagram', new Date().toISOString(), false],
    ['youtube', '2026-09-22T10:35:39Z', false],
  ]) {
    const s = setup({ lookupError: Object.assign(new Error('Post not found'), { code: 'NOT_FOUND' }) });
    Object.assign(s.row, { target_sns: sns, external_service: 'buffer', external_post_id: 'buffer-123' });
    s.row.post_result.registeredAt = registeredAt;
    await s.engine.syncBufferPost(s.client, s.row);
    const delay = s.row.post_result.buffer_lookup.next_check_after - Date.now();
    assert.equal(delay > 23 * 3600000, deferred, sns + registeredAt);
    assert.equal(s.row.status, 'ready');
  }
});

test('real Buffer failure clears unavailable lookup and keeps separate public evidence', async () => {
  const s = setup({ remote: { id: 'buffer-123', channelId: 'channel-youtube', status: 'error', sentAt: null,
    externalLink: null, error: { message: 'New failure' } } });
  Object.assign(s.row, { external_service: 'buffer', external_post_id: 'buffer-123' });
  s.row.post_result.buffer_lookup = { state: 'not_found', external_post_id: 'buffer-123', next_check_after: Date.now() + 86400000 };
  s.row.post_result.public_verification = { evidence: 'keep' };
  await s.engine.syncBufferPost(s.client, s.row);
  assert.equal(s.row.status, 'failed');
  assert.match(s.row.error_detail, /New failure/);
  assert.equal(s.row.post_result.buffer_lookup.state, 'available');
  assert.equal(s.row.post_result.public_verification.evidence, 'keep');
  assert.equal(s.creates(), 0);
});

test('NOT_FOUND is reported as unverified, not a successful sync or a publishing failure', async () => {
  const s = setup({ lookupError: Object.assign(new Error('Post not found'), { code: 'NOT_FOUND' }) });
  Object.assign(s.row, { external_service: 'buffer', external_post_id: 'buffer-123' });
  const query = s.client.query.bind(s.client);
  s.client.query = async (sql, values) => {
    if (sql.startsWith('SELECT * FROM sns.posts')) {
      assert.match(sql, /target_sns <> ALL\(\$2::text\[\]\)/);
      assert.deepEqual(Array.from(values[1]), ['instagram']);
      return { rows: [s.row] };
    }
    return query(sql, values);
  };
  const result = await s.engine.syncBufferStatuses(s.client);
  assert.equal(result.synced.length, 0);
  assert.equal(result.unverified.length, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(s.creates(), 0);
});

test('Buffer client exposes structured NOT_FOUND and keeps other error codes distinct', async () => {
  for (const code of ['NOT_FOUND', 'UNAUTHORIZED']) {
    const context = { module: { exports: {} }, process: { env: { BUFFER_API_KEY: 'test-value' } }, Buffer,
      require() { return { request(url, options, done) { return { on() {}, write() {}, end() {
        const handlers = {}; done({ on(event, callback) { handlers[event] = callback; } });
        handlers.data(JSON.stringify({ errors: [{ message: 'Read failed', path: ['post'], extensions: { code } }] }));
        handlers.end();
      } }; } }; } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'buffer-client.js'), 'utf8'), context);
    await assert.rejects(() => context.module.exports.getPost('buffer-123'), e => e.code === code);
  }
});

test('Buffer scheduled is accepted, sent is published, error is failed', async () => {
  for (const [remoteStatus, localStatus, delivery] of [
    ['scheduled', 'ready', 'accepted'], ['draft', 'needs_review', 'unknown'],
    ['needs_approval', 'needs_review', 'unknown'], ['sent', 'sent', 'published'],
    ['error', 'failed', 'failed'],
  ]) {
    const s = setup({ createdStatus: remoteStatus });
    await s.engine.processOne(s.client, s.row, { dryRun: false });
    assert.equal(s.row.status, localStatus, remoteStatus);
    assert.equal(s.row.post_result.delivery_status, delivery, remoteStatus);
  }
});

test('registered post skips before expired or duplicate checks and never reposts', async () => {
  const s = setup({ duplicate: { id: 'buffer-123' } });
  s.row.external_post_id = 'buffer-123';
  s.row.scheduled_at = '2020-01-01T00:00:00Z';
  await s.engine.processOne(s.client, s.row, { dryRun: false });
  assert.equal(s.row.status, 'ready');
  assert.equal(s.creates(), 0);
});

test('sync publishes final status and public link without creating a post', async () => {
  const s = setup({ remote: { id: 'buffer-123', channelId: 'channel-youtube', status: 'sent',
    sentAt: '2026-10-13T07:22:36.004Z', externalLink: 'https://www.youtube.com/shorts/example', error: null } });
  Object.assign(s.row, { external_service: 'buffer', external_post_id: 'buffer-123', error_detail: 'Old failure' });
  for (let i = 0; i < 2; i++) await s.engine.syncBufferPost(s.client, s.row);
  assert.equal(s.row.status, 'sent');
  assert.equal(s.row.error_detail, null);
  assert.equal(s.row.matched_external_link, 'https://www.youtube.com/shorts/example');
  assert.equal(s.row.post_result.status, 'sent');
  assert.equal(s.row.post_result.delivery_status, 'published');
  assert.deepEqual(s.row.post_result.failure_history, ['keep']);
  assert.equal(s.creates(), 0);
});

test('sync error corrects old false sent, saves failure, and does not retry', async () => {
  const s = setup({ remote: { id: 'buffer-123', channelId: 'channel-youtube', status: 'error', sentAt: null,
    externalLink: null, error: { message: 'Video rejected' } } });
  Object.assign(s.row, { status: 'sent', external_service: 'buffer', external_post_id: 'buffer-123' });
  await s.engine.syncBufferPost(s.client, s.row);
  assert.equal(s.row.status, 'failed');
  assert.match(s.row.error_detail, /Video rejected/);
  assert.equal(s.row.post_result.delivery_status, 'failed');
  assert.equal(s.row.external_post_id, 'buffer-123');
  assert.equal(s.creates(), 0);
});

test('sync lookup failure or mismatched id/channel preserves data without repost', async () => {
  for (const config of [{ lookupError: true }, { remote: null },
    { remote: { id: 'wrong', channelId: 'channel-youtube', status: 'sent' } },
    { remote: { id: 'buffer-123', channelId: 'wrong', status: 'sent' } }]) {
    const s = setup(config);
    Object.assign(s.row, { external_service: 'buffer', external_post_id: 'buffer-123' });
    await assert.rejects(() => s.engine.syncBufferPost(s.client, s.row));
    assert.equal(s.row.status, 'ready');
    assert.equal(s.creates(), 0);
  }
});

test('unknown Buffer status never becomes published', async () => {
  const s = setup({ remote: { id: 'buffer-123', channelId: 'channel-youtube', status: 'future_status', error: null } });
  Object.assign(s.row, { external_service: 'buffer', external_post_id: 'buffer-123' });
  await s.engine.syncBufferPost(s.client, s.row);
  assert.equal(s.row.status, 'needs_review');
  assert.equal(s.row.post_result.delivery_status, 'unknown');
  assert.equal(s.creates(), 0);
});

test('existing dry-run, publication, overdue and duplicate guards remain effective', async () => {
  const checks = [
    [{ is_publishable: false }, 'needs_review'], [{ feature_published: false }, 'needs_review'],
    [{ media_urls: [] }, 'needs_review'], [{ duplicate_check: { result: 'duplicate' } }, 'needs_review'],
    [{ scheduled_at: '2020-01-01T00:00:00Z' }, 'expired'],
    [{ scheduled_at: new Date(Date.now() - 90 * 60000).toISOString() }, 'needs_review'],
  ];
  for (const [patch, status] of checks) {
    const s = setup(); Object.assign(s.row, patch);
    await s.engine.processOne(s.client, s.row, { dryRun: false });
    assert.equal(s.row.status, status); assert.equal(s.creates(), 0);
  }
  const d = setup(); await d.engine.processOne(d.client, d.row, { dryRun: true });
  assert.equal(d.row.status, 'ready'); assert.equal(d.creates(), 0);
  const dup = setup({ duplicate: { id: 'existing' } });
  await dup.engine.processOne(dup.client, dup.row, { dryRun: false });
  assert.equal(dup.row.status, 'needs_review'); assert.equal(dup.creates(), 0);
});

test('live cron syncs an existing post but never claims registered posts', async () => {
  const s = setup({ remote: { id: 'buffer-123', channelId: 'channel-youtube', status: 'sent',
    sentAt: '2026-10-13T07:22:36.004Z', externalLink: 'https://www.youtube.com/shorts/example', error: null } });
  Object.assign(s.row, { external_service: 'buffer', external_post_id: 'buffer-123' });
  const query = s.client.query.bind(s.client);
  s.client.query = async (sql, values) => {
    if (sql.startsWith('SELECT * FROM sns.posts')) return { rows: [s.row] };
    if (sql.includes('SELECT id FROM sns.posts')) {
      assert.match(sql, /external_post_id IS NULL/);
      assert.match(sql, /FOR UPDATE SKIP LOCKED/);
      return { rows: [] };
    }
    if (sql.includes('SELECT count(*)')) return { rows: [{ count: 0 }] };
    return query(sql, values);
  };
  const result = await s.engine.runCronEngine({ dryRun: false });
  assert.equal(result.synced.length, 1);
  assert.equal(result.processed.length, 0);
  assert.equal(result.errors.length, 0);
  assert.equal(s.row.status, 'sent');
  assert.equal(s.creates(), 0);
});

test('manual dry-run never runs delivery sync or publishes', async () => {
  const s = setup();
  const query = s.client.query.bind(s.client);
  s.client.query = async (sql, values) => {
    assert.ok(!sql.startsWith('SELECT * FROM sns.posts'), 'dry-run must not sync Buffer delivery');
    if (sql.includes('SELECT count(*)')) return { rows: [{ count: 0 }] };
    return query(sql, values);
  };
  const result = await s.engine.runCronEngine({ dryRun: true });
  assert.equal(result.synced.length, 0);
  assert.equal(result.errors.length, 0);
  assert.equal(s.creates(), 0);
});
