const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { METRICS, collectInsights, runCli } = require('./fetch-threads-insights');

const NOW = new Date('2026-10-20T09:00:00Z');
const SENTINEL = 'MOCK_SECRET_NOT_A_REAL_TOKEN_unsafe&query=private';
const post = (id, timestamp = '2026-10-20T01:00:00Z') => ({ id, timestamp, permalink: `https://www.threads.com/@genba_apps/post/Mock${id}` });
const insights = (value = 1) => ({ data: METRICS.map(name => ({ name, period: 'lifetime', values: [{ value }] })) });
function clientFor(posts, getInsights = async () => insights()) {
  return { getMe: async () => ({ id: '123', username: 'genba_apps' }), listRecentPosts: async () => posts, getInsights };
}

test('lifetime totals for fetched posts and today-published cohort are separate from daily increase', async () => {
  const rows = [post('1', '2026-10-19T14:59:59Z'), post('2', '2026-10-19T15:00:00Z'), post('3')];
  const r = await collectInsights({ now: NOW, client: clientFor(rows, async id => insights(Number(id))) });
  assert.equal(r.status, 'complete');
  assert.equal(r.collected_at_utc, '2026-10-20T09:00:00.000Z');
  assert.equal(r.collected_at_jst, '2026-10-20T18:00:00.000+09:00');
  assert.equal(r.summaries.all_fetched_posts_lifetime.metrics.views.total, 6);
  assert.equal(r.summaries.today_published_posts_lifetime.metrics.views.total, 5);
  assert.deepEqual(r.today_increase_all_posts, { status: 'not_measured', value: null, reason: 'no_comparable_snapshots' });
});

test('JST midnight boundaries, explicit timezone offsets and the next day', async () => {
  const dates = ['2026-10-19T14:59:59.999Z', '2026-10-19T15:00:00Z', '2026-10-20T14:59:59.999Z', '2026-10-20T15:00:00Z', '2026-10-20T00:00:00+09:00', '2026-10-19T15:00:00+0000', '2026-10-20T15:00:00+0000', '2026-10-20T00:00:00+0900'];
  const r = await collectInsights({ now: NOW, client: clientFor(dates.map((date, i) => post(String(i + 1), date))) });
  assert.deepEqual(r.posts.map(p => p.published_today_jst), [false, true, true, false, true, true, false, true]);
});

test('unknown publication time cannot make today-cohort total look complete', async () => {
  const r = await collectInsights({ now: NOW, client: clientFor([post('1', 'not-a-date'), post('2')]) });
  assert.equal(r.posts[0].published_at_utc, null);
  const today = r.summaries.today_published_posts_lifetime;
  assert.equal(today.unknown_publication_time_posts, 1);
  assert.equal(today.metrics.views.total, null);
  assert.equal(today.metrics.views.known_sum, 1);
});

test('zero is measured; null, absent metrics and empty values are missing', async () => {
  const response = { data: [
    { name: 'views', period: 'lifetime', values: [{ value: 0 }] },
    { name: 'likes', period: 'lifetime', values: [{ value: null }] },
    { name: 'replies', period: 'lifetime', values: [] },
  ] };
  const r = await collectInsights({ now: NOW, client: clientFor([post('1')], async () => response) });
  assert.deepEqual(r.posts[0].lifetime_metrics.views, { value: 0, status: 'ok' });
  for (const name of METRICS.filter(name => name !== 'views')) assert.deepEqual(r.posts[0].lifetime_metrics[name], { value: null, status: 'missing' });
  assert.equal(r.summaries.all_fetched_posts_lifetime.metrics.likes.known_sum, null);
  assert.equal(r.summaries.all_fetched_posts_lifetime.metrics.views.total, 0);
});

test('partial request failure preserves other posts and does not invent complete totals', async () => {
  const r = await collectInsights({ now: NOW, client: clientFor([post('1'), post('2')], async id => {
    if (id === '2') throw new Error(SENTINEL);
    return insights(7);
  }) });
  const views = r.summaries.all_fetched_posts_lifetime.metrics.views;
  assert.equal(r.status, 'partial');
  assert.equal(views.total, null);
  assert.equal(views.known_sum, 7);
  assert.equal(views.counts.request_failed, 1);
  assert.equal(r.posts[1].lifetime_metrics.views.value, null);
  assert.ok(!JSON.stringify(r).includes(SENTINEL));
});

test('invalid numeric values and non-lifetime periods are not silently accepted', async () => {
  const values = ['12', -1, Infinity, Number.MAX_SAFE_INTEGER + 1];
  for (const value of values) {
    const r = await collectInsights({ now: NOW, client: clientFor([post('1')], async () => insights(value)) });
    assert.equal(r.posts[0].lifetime_metrics.views.status, 'invalid_value');
  }
  const response = insights(); response.data[0].period = 'day';
  const r = await collectInsights({ now: NOW, client: clientFor([post('1')], async () => response) });
  assert.equal(r.posts[0].lifetime_metrics.views.status, 'unsupported_period');
});

test('ambiguous or malformed insight payloads stay unknown', async () => {
  const responses = [{}, { data: null }, { data: [insights().data[0], insights().data[0]] }, { data: [{ name: 'views', period: 'lifetime', values: [{ value: 1 }, { value: 2 }] }] }];
  for (const response of responses) {
    const r = await collectInsights({ now: NOW, client: clientFor([post('1')], async () => response) });
    assert.equal(r.posts[0].lifetime_metrics.views.status, 'invalid_response');
    assert.equal(r.posts[0].lifetime_metrics.views.value, null);
  }
});

test('aggregation detects overflow instead of rounding an integer total', async () => {
  const r = await collectInsights({ now: NOW, client: clientFor([post('1'), post('2')], async id => insights(id === '1' ? Number.MAX_SAFE_INTEGER : 1)) });
  assert.equal(r.summaries.all_fetched_posts_lifetime.metrics.views.status, 'overflow');
  assert.equal(r.summaries.all_fetched_posts_lifetime.metrics.views.total, null);
  assert.equal(r.status, 'partial');
});

test('invalid calendar dates and secret-bearing metadata never appear as publication data', async () => {
  const dates = ['2026-02-30T00:00:00Z', '2026-10-19T24:00:00Z', SENTINEL];
  const rows = dates.map((date, i) => ({ ...post(String(i + 1), date), permalink: `https://${SENTINEL}@www.threads.com/@genba_apps/post/Mock` }));
  const r = await collectInsights({ now: NOW, client: clientFor(rows) });
  assert.ok(r.posts.every(p => p.published_at_utc === null && p.url === null));
  assert.ok(!JSON.stringify(r).includes(SENTINEL));
});

test('limit is 40 and no additional page is requested', async () => {
  const calls = []; const c = clientFor(Array.from({ length: 45 }, (_, i) => post(String(i + 1))));
  c.listRecentPosts = async (...args) => { calls.push(args); return Array.from({ length: 45 }, (_, i) => post(String(i + 1))); };
  const r = await collectInsights({ now: NOW, client: c });
  assert.deepEqual(calls, [['123', 40]]);
  assert.equal(r.posts.length, 40);
  assert.equal(r.scope.additional_pages_fetched, false);
});

test('a capped page cannot claim a complete today-published cohort', async () => {
  const r = await collectInsights({ now: NOW, client: clientFor(Array.from({ length: 40 }, (_, i) => post(String(i + 1)))) });
  const today = r.summaries.today_published_posts_lifetime;
  assert.equal(today.membership_complete, false);
  assert.equal(today.account_day_coverage, 'not_verified');
  assert.equal(today.metrics.views.total, null);
  assert.equal(today.metrics.views.known_sum, 40);
});

test('empty fetched set is distinct from account/list failures', async () => {
  const empty = await collectInsights({ now: NOW, client: clientFor([]) });
  assert.equal(empty.status, 'complete');
  assert.equal(empty.summaries.all_fetched_posts_lifetime.metrics.views.total, 0);
  for (const method of ['getMe', 'listRecentPosts']) {
    const c = clientFor([]); c[method] = async () => { throw new Error(SENTINEL); };
    const r = await collectInsights({ now: NOW, client: c });
    assert.equal(r.scope.posts_returned, null);
    assert.equal(r.summaries, null);
    assert.equal(r.status, 'failed');
  }
});

test('unexpected account and invalid IDs stop before the corresponding API calls', async () => {
  const c = clientFor([]); c.getMe = async () => ({ id: '123', username: SENTINEL });
  c.listRecentPosts = async () => { throw new Error('must not list'); };
  const r = await collectInsights({ now: NOW, client: c });
  assert.equal(r.failure, 'account_not_verified');
  const c2 = clientFor([post('123?access_token=' + SENTINEL)]);
  c2.getInsights = async () => { throw new Error('must not fetch'); };
  const r2 = await collectInsights({ now: NOW, client: c2 });
  assert.equal(r2.posts[0].id, null);
  assert.equal(r2.posts[0].lifetime_metrics.views.status, 'invalid_post_id');
  assert.ok(!JSON.stringify([r, r2]).includes(SENTINEL));
});

test('logs omit error message, stack, raw body, query, post text and unsafe URLs', async () => {
  const p = post('1'); p.text = SENTINEL; p.permalink += '?access_token=' + encodeURIComponent(SENTINEL);
  const c = clientFor([p], async () => { const e = new Error(SENTINEL); e.stack = SENTINEL; e.rawBody = SENTINEL; e.query = SENTINEL; throw e; });
  const output = []; const code = await runCli({ now: NOW, client: c, write: line => output.push(line) });
  assert.equal(code, 1);
  assert.equal(JSON.parse(output.join('')).posts[0].url, null);
  for (const secret of [SENTINEL, encodeURIComponent(SENTINEL)]) assert.ok(!output.join('').includes(secret));
});

test('CLI rejects flags before API access and catches unexpected failures without details', async () => {
  const c = clientFor([]); c.getMe = async () => { throw new Error('must not call'); };
  const output = [];
  assert.equal(await runCli({ client: c, args: ['--publish-test'], write: line => output.push(line) }), 1);
  assert.equal(JSON.parse(output.pop()).failure, 'unsupported_arguments');
  assert.equal(await runCli({ client: c, now: 'invalid', write: line => output.push(line) }), 1);
  assert.equal(JSON.parse(output.pop()).failure, 'internal_error');
});

test('real shared-client adapter issues GET only, without request bodies or secret-bearing logs', async () => {
  const requests = []; let writes = 0;
  const fakeHttps = { request(options, callback) {
    requests.push(options);
    const req = new EventEmitter();
    req.write = () => { writes++; throw new Error('write forbidden'); };
    req.end = () => queueMicrotask(() => {
      const response = new EventEmitter();
      callback(response);
      const pathname = new URL('https://' + options.hostname + options.path).pathname;
      const payload = pathname === '/v1.0/me' ? { id: '123', username: 'genba_apps' }
        : pathname === '/v1.0/123/threads' ? { data: [post('1')], paging: { next: 'https://must-not-follow.invalid/' } }
        : pathname === '/v1.0/1/insights' ? insights(2) : { error: { message: SENTINEL } };
      response.emit('data', JSON.stringify(payload)); response.emit('end');
    });
    return req;
  } };
  const adapterModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'threads-client.js'), 'utf8'), {
    module: adapterModule, process: { env: { THREADS_ACCESS_TOKEN: SENTINEL } },
    require(name) { assert.equal(name, 'https'); return fakeHttps; }, URLSearchParams,
  });
  const output = [];
  assert.equal(await runCli({ now: NOW, client: adapterModule.exports, write: line => output.push(line) }), 0);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(r => r.method === 'GET' && r.hostname === 'graph.threads.net'));
  assert.equal(writes, 0);
  assert.ok(!output.join('').includes(SENTINEL));
  assert.ok(!output.join('').includes(encodeURIComponent(SENTINEL)));
});

test('manual workflow has only read permission, no inputs, schedule, publishing or DB entry', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '.github/workflows/threads-insights-read.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch: \{\}/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /run: node fetch-threads-insights\.js/);
  assert.doesNotMatch(workflow, /schedule:|repository_dispatch:|publish_test|cron-engine|db-client|npm (install|ci)|inputs:/);
  assert.equal((workflow.match(/THREADS_ACCESS_TOKEN:/g) || []).length, 1);
});
