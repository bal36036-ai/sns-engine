const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const baseline = read('supabase/20260928_sns_cron_dispatch_to_github.sql');
const baselineFunction = baseline.match(/create or replace function[\s\S]*?\$\$;/i)[0];
const baselineBody = baselineFunction.match(/as \$\$([\s\S]*?)\$\$;/i)[1];
const migrationNames = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(name => name.endsWith('_sns_skip_idle_cron_dispatch.sql'));
assert.equal(migrationNames.length, 1);
const migration = read(`supabase/migrations/${migrationNames[0]}`);
const rollback = () => read('supabase/rollbacks/sns_skip_idle_cron_dispatch.sql');
const channels = require(path.join(root, 'buffer-channels.js'));

// Execute the unchanged production selector functions with network/DB dependencies sealed off.
async function captureSelectors() {
  const queries = [];
  const client = { release() {}, async query(sql, values = []) {
    queries.push({ sql, values });
    return { rows: sql.includes('count(*)') ? [{ count: 0 }] : [] };
  } };
  const context = { module: { exports: {} }, console, Date, process: { env: {} },
    require(name) {
      if (name === './db-client') return { getPool: () => ({ connect: async () => client, end: async () => {} }) };
      if (name === './buffer-channels') return channels;
      if (['https', './buffer-client', './threads-client'].includes(name)) return {};
      throw new Error(`Forbidden dependency: ${name}`);
    } };
  vm.runInNewContext(read('cron-engine.js'), context);
  await context.module.exports.runCronEngine({ dryRun: true });
  await context.module.exports.syncBufferStatuses(client);
  return {
    claim: queries.find(q => q.sql.includes('SELECT id FROM sns.posts')),
    sync: queries.find(q => q.sql.startsWith('SELECT * FROM sns.posts')),
  };
}

const schema = `
  CREATE SCHEMA sns;
  CREATE SCHEMA vault;
  CREATE SCHEMA net;
  CREATE TABLE sns.posts (
    id uuid PRIMARY KEY, status text, external_service text, external_post_id text,
    scheduled_at timestamptz, claimed_at timestamptz, claimed_by text,
    created_at timestamptz DEFAULT now(), target_sns text, is_historical boolean,
    post_result jsonb, matched_external_link text,
    is_publishable boolean, feature_published boolean, media_urls text[]
  );
  CREATE TABLE public.test_calls (kind text, payload jsonb);
  CREATE TABLE public.test_flags (vault_error boolean DEFAULT false, http_error boolean DEFAULT false);
  INSERT INTO public.test_flags DEFAULT VALUES;
  CREATE FUNCTION vault.test_secret() RETURNS text LANGUAGE plpgsql AS $mock$
  BEGIN
    IF (SELECT vault_error FROM public.test_flags) THEN RAISE EXCEPTION 'mock vault error'; END IF;
    INSERT INTO public.test_calls VALUES ('vault', NULL);
    RETURN 'synthetic-local-value';
  END $mock$;
  CREATE VIEW vault.decrypted_secrets AS
    SELECT 'github_dispatch_token'::text AS name, vault.test_secret() AS decrypted_secret;
  CREATE FUNCTION net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds integer)
  RETURNS bigint LANGUAGE plpgsql AS $mock$
  BEGIN
    IF (SELECT http_error FROM public.test_flags) THEN RAISE EXCEPTION 'mock http error'; END IF;
    -- Never persist authorization, even the synthetic test value.
    INSERT INTO public.test_calls VALUES ('http', jsonb_build_object('url', url, 'body', body, 'timeout', timeout_milliseconds));
    RETURN 123;
  END $mock$;
  CREATE ROLE test_dispatch_owner;
  CREATE ROLE test_dispatch_caller;
  CREATE ROLE test_dispatch_denied;
  GRANT USAGE ON SCHEMA sns TO test_dispatch_owner, test_dispatch_caller, test_dispatch_denied;
  GRANT CREATE ON SCHEMA sns TO test_dispatch_owner;
  GRANT USAGE ON SCHEMA vault, net TO test_dispatch_owner;
  GRANT SELECT ON ALL TABLES IN SCHEMA sns, vault TO test_dispatch_owner;
  GRANT SELECT ON public.test_flags TO test_dispatch_owner;
  GRANT INSERT ON public.test_calls TO test_dispatch_owner;
`;

async function fixture(db, patch = {}) {
  const row = {
    id: '00000000-0000-0000-0000-000000000001', status: 'ready', external_service: null,
    external_post_id: null, scheduled_at: null, claimed_at: null, claimed_by: null,
    created_at: '2026-01-01T00:00:00Z', target_sns: 'youtube', is_historical: false,
    post_result: null, matched_external_link: null, is_publishable: true,
    feature_published: true, media_urls: [], ...patch,
  };
  await db.exec('TRUNCATE sns.posts, public.test_calls; UPDATE public.test_flags SET vault_error = false, http_error = false;');
  const keys = Object.keys(row);
  await db.query(`INSERT INTO sns.posts (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`,
    keys.map(key => key === 'post_result' && row[key] !== null ? JSON.stringify(row[key]) : row[key]));
}
const call = async db => (await db.query('SELECT sns.dispatch_cron_engine() AS result')).rows[0].result;
const callKinds = async db => (await db.query('SELECT kind FROM public.test_calls')).rows.map(r => r.kind).sort();
const metadata = async db => (await db.query(`
  SELECT oid, proowner, proacl::text, prosecdef, proconfig, provolatile, proparallel, procost
  FROM pg_proc WHERE oid = 'sns.dispatch_cron_engine()'::regprocedure`)).rows[0];
const selected = async (db, q) => (await db.query(q.sql, q.values)).rows.map(row => row.id);

test('migration must add the idle gate before vault lookup', () => {
  assert.match(migration, /IF NOT EXISTS/i);
  assert.match(migration, /RETURN NULL/i);
  assert.doesNotMatch(migration, /^BEGIN;|^COMMIT;/m);
  assert.doesNotMatch(rollback(), /^BEGIN;|^COMMIT;/m);
  assert.match(migration, new RegExp(crypto.createHash('md5').update(baselineBody.trim()).digest('hex')));
});

test('real local PostgreSQL: gate, unchanged selector equivalence, side effects and rollback', async t => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    await db.exec(baselineFunction);
    await db.exec(`ALTER FUNCTION sns.dispatch_cron_engine() OWNER TO test_dispatch_owner;
      ALTER FUNCTION sns.dispatch_cron_engine() COST 37;
      ALTER FUNCTION sns.dispatch_cron_engine() SET application_name TO 'dispatch-metadata-test';
      REVOKE ALL ON FUNCTION sns.dispatch_cron_engine() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION sns.dispatch_cron_engine() TO test_dispatch_caller;`);
    const originalMetadata = await metadata(db);
    const originalDefinition = (await db.query("SELECT pg_get_functiondef('sns.dispatch_cron_engine()'::regprocedure) AS def")).rows[0].def;
    await db.exec(migration);
    assert.deepEqual(await metadata(db), originalMetadata);
    const guardedDefinition = (await db.query("SELECT pg_get_functiondef('sns.dispatch_cron_engine()'::regprocedure) AS def")).rows[0].def;
    assert.ok(guardedDefinition.indexOf('IF NOT EXISTS') < guardedDefinition.indexOf('select decrypted_secret'));
    await db.exec(migration); // rerunning must not duplicate the gate
    assert.equal((await db.query("SELECT pg_get_functiondef('sns.dispatch_cron_engine()'::regprocedure) AS def")).rows[0].def, guardedDefinition);
    const selectors = await captureSelectors();
    assert.ok(selectors.claim && selectors.sync);
    await t.test('both WHERE clauses stay textually equivalent to the unchanged JavaScript selectors', () => {
      const normalize = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const gate = migration.match(/\$gate\$([\s\S]*?)\$gate\$/)[1];
      assert.equal(gate, rollback().match(/\$gate\$([\s\S]*?)\$gate\$/)[1]);
      const [claimWhere, syncWhere] = Array.from(gate.matchAll(/SELECT 1 FROM sns.posts\s+WHERE ([\s\S]*?)\n  \)/g), m => m[1]);
      assert.equal(normalize(claimWhere), normalize(selectors.claim.sql.match(/WHERE ([\s\S]*?)ORDER BY/)[1]));
      const pausedArray = `ARRAY[${Array.from(selectors.sync.values[1], sns => `'${sns.replaceAll("'", "''")}'`).join(',')}]::text[]`;
      assert.equal(normalize(syncWhere), normalize(selectors.sync.sql.match(/WHERE ([\s\S]*?)ORDER BY/)[1].replace('$2::text[]', pausedArray)));
    });
    const now = Date.parse((await db.query('SELECT now() AS n')).rows[0].n);
    const time = delta => new Date(now + delta).toISOString();
    const old = time(-86400000 * 2);
    const futureLookup = { state: 'not_found', external_post_id: 'buffer-test', next_check_after: now + 86400000 };
    const buffer = { external_service: 'buffer', external_post_id: 'buffer-test', status: 'sent',
      post_result: { status: 'sending' }, matched_external_link: null };
    const cases = [
      ['future', { scheduled_at: time(3600000) }, false, false],
      ['due', { scheduled_at: time(-1) }, true, false],
      ['null schedule', {}, true, false],
      ['scheduled', { status: 'scheduled' }, true, false],
      ['draft is notification only', { status: 'draft' }, false, false],
      ['expired state', { status: 'expired' }, false, false],
      ['needs review state', { status: 'needs_review' }, false, false],
      ['recent claim', { claimed_at: time(-9 * 60000) }, false, false],
      ['stale claim', { claimed_at: time(-11 * 60000) }, true, false],
      ['90 minute late remains a candidate', { scheduled_at: time(-90 * 60000) }, true, false],
      ['181 minute late remains a candidate', { scheduled_at: time(-181 * 60000) }, true, false],
      ['not publishable still handled downstream', { is_publishable: false }, true, false],
      ['historical claim has no historical filter', { is_historical: true }, true, false],
      ['null historical claim', { is_historical: null }, true, false],
      ['unsupported channel still handled downstream', { target_sns: 'unsupported' }, true, false],
      ['external ID excludes resend', { external_post_id: 'registered' }, false, false],
      ['empty external ID also excludes claim', { external_post_id: '' }, false, false],
      ['Buffer processing', buffer, false, true],
      ['Buffer accepted', { ...buffer, status: 'ready', post_result: { status: 'scheduled' } }, false, true],
      ['Buffer failed', { ...buffer, status: 'failed', post_result: { status: 'error' } }, false, true],
      ['Buffer unknown', { ...buffer, status: 'needs_review', post_result: { status: 'future_status' } }, false, true],
      ['Buffer sent but missing link', { ...buffer, post_result: { status: 'sent' } }, false, true],
      ['Buffer final sent link', { ...buffer, post_result: { status: 'sent' }, matched_external_link: 'https://example.test/post' }, false, false],
      ['Buffer missing result', { ...buffer, post_result: null }, false, true],
      ['Buffer historical excluded', { ...buffer, is_historical: true }, false, false],
      ['Buffer null historical excluded', { ...buffer, is_historical: null }, false, false],
      ['other service excluded', { ...buffer, external_service: 'threads' }, false, false],
      ['paused old NOT_FOUND deferred', { ...buffer, target_sns: 'instagram', post_result: { registeredAt: old, buffer_lookup: futureLookup } }, false, false],
      ['paused NOT_FOUND due', { ...buffer, target_sns: 'instagram', post_result: { buffer_lookup: { ...futureLookup, next_check_after: now - 1 } } }, false, true],
      ['active NOT_FOUND never deferred', { ...buffer, target_sns: 'youtube', post_result: { buffer_lookup: futureLookup } }, false, true],
      ['changed external ID rechecks', { ...buffer, target_sns: 'instagram', external_post_id: 'new-id', post_result: { buffer_lookup: futureLookup } }, false, true],
      ['paused available rechecks', { ...buffer, target_sns: 'instagram', post_result: { buffer_lookup: { ...futureLookup, state: 'available' } } }, false, true],
      ['malformed result array', { ...buffer, target_sns: 'instagram', post_result: [] }, false, true],
      ['malformed result scalar', { ...buffer, target_sns: 'instagram', post_result: 'bad' }, false, true],
      ['malformed lookup scalar', { ...buffer, target_sns: 'instagram', post_result: { buffer_lookup: 'bad' } }, false, true],
      ...[null, 'invalid', '9999999999999999999999', {}, [], true].map(next =>
        [`malformed next ${JSON.stringify(next)}`, { ...buffer, target_sns: 'instagram', post_result: { buffer_lookup: { ...futureLookup, next_check_after: next } } }, false, true]),
      ['numeric next larger than bigint', { ...buffer, target_sns: 'instagram', post_result: { buffer_lookup: { ...futureLookup, next_check_after: 1e30 } } }, false, false],
      ['null Buffer status uses result/link', { ...buffer, status: null }, false, true],
      ['null Buffer channel with deferred lookup', { ...buffer, target_sns: null, post_result: { buffer_lookup: futureLookup } }, false, false],
    ];
    for (const [name, patch, claimExpected, syncExpected] of cases) {
      await t.test(name, async () => {
        await fixture(db, patch);
        const before = (await db.query('SELECT * FROM sns.posts')).rows;
        assert.equal((await selected(db, selectors.claim)).length > 0, claimExpected, 'production claim');
        assert.equal((await selected(db, selectors.sync)).length > 0, syncExpected, 'production sync');
        assert.equal(await call(db), claimExpected || syncExpected ? 123 : null);
        assert.deepEqual(await callKinds(db), claimExpected || syncExpected ? ['http', 'vault'] : []);
        assert.deepEqual((await db.query('SELECT * FROM sns.posts')).rows, before, 'gate must not claim or modify a post');
      });
    }
    await t.test('empty table skips vault even if vault is broken', async () => {
      await db.exec('TRUNCATE sns.posts, public.test_calls; UPDATE public.test_flags SET vault_error = true;');
      assert.equal(await call(db), null);
      assert.deepEqual(await callKinds(db), []);
    });
    await t.test('exact due/claim/recheck boundaries use the same transaction clock', async () => {
      for (const [column, expression, patch, expected] of [
        ['scheduled_at', 'now()', {}, true],
        ['scheduled_at', "now() + interval '1 microsecond'", {}, false],
        ['claimed_at', "now() - interval '10 minutes'", {}, false],
        ['claimed_at', "now() - interval '10 minutes 0.000001 seconds'", {}, true],
        ['post_result', "jsonb_build_object('buffer_lookup', jsonb_build_object('state', 'not_found', 'external_post_id', 'buffer-test', 'next_check_after', extract(epoch from now()) * 1000))", { ...buffer, target_sns: 'instagram' }, true],
      ]) {
        await fixture(db, patch);
        await db.transaction(async tx => {
          await tx.exec(`UPDATE sns.posts SET ${column} = ${expression}`);
          const actual = (await selected(tx, selectors.claim)).length > 0 || (await selected(tx, selectors.sync)).length > 0;
          assert.equal(actual, expected, expression);
          assert.equal(await call(tx), expected ? 123 : null, expression);
        });
      }
    });
    await t.test('invalid JSON syntax is rejected, not interpreted as an empty success', async () => {
      await assert.rejects(() => db.query('UPDATE sns.posts SET post_result = $1::jsonb', ['{broken']), e => e.code === '22P02');
    });
    await t.test('predicate/schema errors propagate before vault', async () => {
      await fixture(db);
      await db.exec('ALTER TABLE sns.posts RENAME COLUMN claimed_at TO broken_claimed_at;');
      try { await assert.rejects(() => call(db), e => e.code === '42703'); }
      finally { await db.exec('ALTER TABLE sns.posts RENAME COLUMN broken_claimed_at TO claimed_at;'); }
      assert.deepEqual(await callKinds(db), []);
    });
    await t.test('vault and HTTP errors are not swallowed', async () => {
      await fixture(db);
      await db.exec('UPDATE public.test_flags SET vault_error = true;');
      await assert.rejects(() => call(db), /mock vault error/);
      await db.exec('UPDATE public.test_flags SET vault_error = false, http_error = true;');
      await assert.rejects(() => call(db), /mock http error/);
    });
    await t.test('grant/deny behavior and original HTTP arguments remain intact', async () => {
      await fixture(db);
      await db.exec('SET ROLE test_dispatch_denied;');
      try { await assert.rejects(() => call(db), e => e.code === '42501'); }
      finally { await db.exec('RESET ROLE;'); }
      await db.exec('SET ROLE test_dispatch_caller;');
      try { assert.equal(await call(db), 123); }
      finally { await db.exec('RESET ROLE;'); }
      const { payload } = (await db.query("SELECT payload FROM public.test_calls WHERE kind = 'http'")).rows[0];
      assert.equal(payload.url, 'https://api.github.com/repos/bal36036-ai/sns-engine/dispatches');
      assert.equal(payload.body.event_type, 'cron-live');
      assert.equal(payload.body.client_payload.source, 'supabase-pg_cron');
      assert.equal(payload.timeout, 10000);
      assert.deepEqual(await metadata(db), originalMetadata);
    });
    await t.test('duplicate invocation has no new claims/dedup side effects; existing claim prevents a second acquisition', async () => {
      await fixture(db);
      assert.deepEqual(await Promise.all([call(db), call(db)]), [123, 123]);
      assert.equal((await selected(db, selectors.claim)).length, 1);
      await db.exec('UPDATE sns.posts SET claimed_at = now();');
      assert.equal((await selected(db, selectors.claim)).length, 0);
      assert.equal(await call(db), null);
      // PGlite has one backend: this checks repeated invocations, not concurrent row-lock contention.
    });
    await t.test('rollback restores the exact definition and permissions, then reapplication works', async () => {
      await db.exec(rollback());
      assert.equal((await db.query("SELECT pg_get_functiondef('sns.dispatch_cron_engine()'::regprocedure) AS def")).rows[0].def, originalDefinition);
      assert.deepEqual(await metadata(db), originalMetadata);
      await db.exec('TRUNCATE sns.posts, public.test_calls;');
      assert.equal(await call(db), 123, 'rollback returns to unconditional dispatch');
      await db.exec(rollback());
      await db.exec(migration);
      assert.equal(await call(db), null);
    });
    await t.test('unrecognized function body aborts apply and rollback without changing it', async () => {
      await db.exec("CREATE OR REPLACE FUNCTION sns.dispatch_cron_engine() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN 456; END $$;");
      for (const sql of [migration, rollback()]) {
        await assert.rejects(() => db.exec(sql), /unexpected dispatch_cron_engine body/i);
        assert.equal(await call(db), 456);
      }
    });
  } finally { await db.close(); }
});
