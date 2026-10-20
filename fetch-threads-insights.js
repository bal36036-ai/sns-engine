// Manual, read-only insights snapshot. No publishing, DB access, or pagination.
const METRICS = Object.freeze(['views', 'likes', 'replies', 'reposts', 'quotes', 'shares']);
const EXPECTED_ACCOUNT = 'genba_apps';
const POST_LIMIT = 40;
const JST_OFFSET = 9 * 60 * 60 * 1000;

function jst(date) {
  return new Date(date.getTime() + JST_OFFSET).toISOString().replace('Z', '+09:00');
}

function publicationTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return null;
  const calendarDay = new Date(value.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(calendarDay.getTime()) || calendarDay.toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  const date = new Date(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  return Number.isFinite(date.getTime()) ? date : null;
}

function publicUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'].includes(url.hostname) ||
        url.username || url.password || url.port || url.search || url.hash ||
        !/^\/@genba_apps\/post\/[A-Za-z0-9_-]{1,32}\/?$/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

function unknownMetrics(status) {
  return Object.fromEntries(METRICS.map(name => [name, { value: null, status }]));
}

function parseMetrics(response) {
  if (!response || !Array.isArray(response.data)) return unknownMetrics('invalid_response');
  return Object.fromEntries(METRICS.map(name => {
    const entries = response.data.filter(item => item && item.name === name);
    if (entries.length === 0) return [name, { value: null, status: 'missing' }];
    if (entries.length !== 1) return [name, { value: null, status: 'invalid_response' }];
    const item = entries[0];
    if (item.period !== 'lifetime') return [name, { value: null, status: 'unsupported_period' }];
    if (!Array.isArray(item.values) || item.values.length === 0) return [name, { value: null, status: 'missing' }];
    if (item.values.length !== 1) return [name, { value: null, status: 'invalid_response' }];
    const value = item.values[0]?.value;
    if (value == null) return [name, { value: null, status: 'missing' }];
    return [name, Number.isSafeInteger(value) && value >= 0
      ? { value, status: 'ok' } : { value: null, status: 'invalid_value' }];
  }));
}

function aggregate(posts, membershipComplete = true) {
  return Object.fromEntries(METRICS.map(name => {
    const counts = { ok: 0, missing: 0, request_failed: 0, invalid: 0 };
    let sum = 0;
    let overflow = false;
    for (const post of posts) {
      const metric = post.lifetime_metrics[name];
      if (metric.status === 'ok') {
        counts.ok++;
        if (!Number.isSafeInteger(sum + metric.value)) overflow = true;
        else sum += metric.value;
      } else if (metric.status === 'missing') counts.missing++;
      else if (metric.status === 'request_failed') counts.request_failed++;
      else counts.invalid++;
    }
    const complete = membershipComplete && !overflow && counts.ok === posts.length;
    return [name, {
      total: complete ? sum : null,
      known_sum: overflow || (posts.length > 0 && counts.ok === 0) ? null : sum,
      status: overflow ? 'overflow' : complete ? 'complete' : 'partial',
      counts,
    }];
  }));
}

async function collectInsights({ client = require('./threads-client'), now = new Date() } = {}) {
  const collected = new Date(now);
  const today = jst(collected).slice(0, 10);
  const report = {
    schema_version: 1,
    read_only: true,
    status: 'failed',
    collected_at_utc: collected.toISOString(),
    collected_at_jst: jst(collected),
    expected_account: EXPECTED_ACCOUNT,
    account_verified: false,
    scope: { max_posts: POST_LIMIT, posts_returned: null, additional_pages_fetched: false, coverage: 'most_recent_page_only' },
    metric_period: 'lifetime',
    posts: [],
    summaries: null,
    today_increase_all_posts: { status: 'not_measured', value: null, reason: 'no_comparable_snapshots' },
  };
  // Only fixed error categories are returned. Never serialize errors, raw bodies, or queries.
  let me;
  try { me = await client.getMe(); } catch { return { ...report, failure: 'account_request_failed' }; }
  if (me?.username !== EXPECTED_ACCOUNT || !/^[1-9]\d{0,31}$/.test(String(me?.id ?? ''))) {
    return { ...report, failure: 'account_not_verified' };
  }
  report.account_verified = true;
  let recent;
  try { recent = await client.listRecentPosts(me.id, POST_LIMIT); }
  catch { return { ...report, failure: 'posts_request_failed' }; }
  if (!Array.isArray(recent)) return { ...report, failure: 'invalid_posts_response' };
  report.scope.posts_returned = Math.min(recent.length, POST_LIMIT);
  for (const item of recent.slice(0, POST_LIMIT)) {
    const id = typeof item?.id === 'string' && /^[1-9]\d{0,31}$/.test(item.id) ? item.id : null;
    const published = publicationTime(item?.timestamp);
    const row = {
      id,
      url: publicUrl(item?.permalink),
      published_at_utc: published?.toISOString() ?? null,
      published_at_jst: published ? jst(published) : null,
      published_today_jst: published ? jst(published).slice(0, 10) === today : null,
      lifetime_metrics: unknownMetrics('invalid_post_id'),
    };
    if (id) {
      try { row.lifetime_metrics = parseMetrics(await client.getInsights(id, [...METRICS])); }
      catch { row.lifetime_metrics = unknownMetrics('request_failed'); }
    }
    report.posts.push(row);
  }
  const unknownPublication = report.posts.filter(post => post.published_today_jst === null).length;
  const todayPosts = report.posts.filter(post => post.published_today_jst === true);
  // The shared adapter drops paging metadata; a full page cannot certify today's coverage.
  const todayMembershipComplete = unknownPublication === 0 && recent.length < POST_LIMIT;
  report.summaries = {
    all_fetched_posts_lifetime: { post_count: report.posts.length, metrics: aggregate(report.posts) },
    today_published_posts_lifetime: {
      jst_date: today,
      scope: 'today_published_posts_among_fetched_posts_only',
      post_count: todayPosts.length,
      unknown_publication_time_posts: unknownPublication,
      membership_complete: todayMembershipComplete,
      account_day_coverage: 'not_verified',
      metrics: aggregate(todayPosts, todayMembershipComplete),
    },
  };
  report.status = report.posts.every(post => post.id && post.url && post.published_at_utc &&
    METRICS.every(name => post.lifetime_metrics[name].status === 'ok')) &&
    METRICS.every(name => report.summaries.all_fetched_posts_lifetime.metrics[name].status === 'complete') ? 'complete' : 'partial';
  return report;
}

async function runCli({ client, now, args = [], write = line => process.stdout.write(line + '\n') } = {}) {
  let report;
  try {
    report = args.length ? { schema_version: 1, read_only: true, status: 'failed', failure: 'unsupported_arguments' }
      : await collectInsights({ client, now });
  } catch {
    report = { schema_version: 1, read_only: true, status: 'failed', failure: 'internal_error' };
  }
  write(JSON.stringify(report, null, 2));
  return report.status === 'complete' ? 0 : 1;
}

module.exports = { METRICS, collectInsights, runCli };

if (require.main === module) {
  runCli({ args: process.argv.slice(2) }).then(code => { process.exitCode = code; }).catch(() => {
    process.stdout.write('{"read_only":true,"status":"failed","failure":"output_failed"}\n');
    process.exitCode = 1;
  });
}
