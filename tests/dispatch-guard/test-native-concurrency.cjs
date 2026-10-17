const assert = require('node:assert/strict');
const path = require('node:path');
const { fork } = require('node:child_process');

function startWorker(connection, holdAfterClaim = false, limit = 1) {
  const child = fork(path.join(__dirname, 'native-engine-worker.cjs'), [], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  const messages = new Map();
  const pending = new Map();
  let failure;
  const fail = error => { failure = error; for (const waiter of pending.values()) waiter.reject(error); pending.clear(); };
  child.on('error', fail);
  child.on('message', message => {
    if (message.type === 'error') return fail(new Error(message.error));
    messages.set(message.type, message);
    if (pending.has(message.type)) { pending.get(message.type).resolve(message); pending.delete(message.type); }
  });
  child.on('exit', code => { if (code && !messages.has('done')) fail(new Error(`Worker exited ${code}`)); });
  child.stderr.on('data', data => { if (data.length) fail(new Error(`Local test worker stderr: ${data}`)); });
  child.send({ connection, holdAfterClaim, limit });
  return {
    child,
    wait(type) {
      if (failure) return Promise.reject(failure);
      if (messages.has(type)) return Promise.resolve(messages.get(type));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { child.kill(); reject(new Error(`Worker timed out waiting for ${type}`)); }, 12000);
        pending.set(type, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
      });
    },
    release() { if (child.connected) child.send({ type: 'release' }); },
    stop() { if (child.connected) child.kill(); },
  };
}

module.exports = async function nativeConcurrency({ db, t, fixture, call, callKinds }) {
  console.log(`Native PostgreSQL: ${(await db.query('SHOW server_version')).rows[0].server_version}`);
  await db.exec(`ALTER TABLE sns.posts ADD COLUMN error_detail text, ADD COLUMN title text,
    ADD COLUMN body_text text, ADD COLUMN duplicate_check jsonb, ADD COLUMN matched_posted_at timestamptz;`);
  const seed = async () => {
    await fixture(db);
    await db.exec("UPDATE sns.posts SET title='Synthetic fixture', body_text='Synthetic fixture', media_urls=ARRAY['https://example.test/synthetic.mp4'];");
  };
  await t.test('native: two backend processes can evaluate the non-reserving gate simultaneously', async () => {
    await seed();
    const clients = await Promise.all([db.openClient(), db.openClient()]);
    try {
      const pids = await Promise.all(clients.map(async client => (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid));
      assert.notEqual(pids[0], pids[1]);
      assert.deepEqual(await Promise.all(clients.map(call)), [123, 123]);
      assert.deepEqual(await callKinds(db), ['http', 'http', 'vault', 'vault']);
      assert.equal((await db.query('SELECT claimed_at FROM sns.posts')).rows[0].claimed_at, null);
    } finally { await Promise.all(clients.map(client => client.end())); }
  });
  await t.test('native: dispatch/schedule workers overlap while claim lock is held; only one mock publish', async () => {
    await seed();
    const dispatch = startWorker(db.connection, true);
    let schedule;
    try {
      const claimedA = await dispatch.wait('claim');
      assert.equal(claimedA.ids.length, 1);
      schedule = startWorker(db.connection);
      const claimedB = await schedule.wait('claim');
      const resultB = await schedule.wait('done');
      assert.notEqual(claimedA.backendPid, claimedB.backendPid);
      assert.deepEqual(claimedB.ids, [], 'SKIP LOCKED must finish before A is released');
      assert.equal(resultB.mockCreates, 0);
      assert.deepEqual(resultB.report.errors, []);
      dispatch.release();
      const resultA = await dispatch.wait('done');
      assert.equal(resultA.mockCreates, 1);
      assert.equal(resultA.report.processed.length, 1);
      assert.deepEqual(resultA.report.errors, []);
      const row = (await db.query('SELECT status, external_post_id, claimed_at FROM sns.posts')).rows[0];
      assert.equal(row.status, 'ready');
      assert.ok(row.external_post_id.startsWith('synthetic-buffer-'));
      assert.equal(row.claimed_at, null);
    } finally { dispatch.release(); dispatch.stop(); schedule?.stop(); }
  });
  await t.test('native: concurrent reruns sync the registered ID and do not resend, even with a stale claim', async () => {
    await db.exec("UPDATE sns.posts SET claimed_at=now()-interval '11 minutes';");
    const workers = [startWorker(db.connection), startWorker(db.connection)];
    try {
      const results = await Promise.all(workers.map(worker => worker.wait('done')));
      assert.notEqual(results[0].workerPid, results[1].workerPid);
      assert.equal(results.reduce((sum, result) => sum + result.mockCreates, 0), 0);
      for (const { report } of results) { assert.equal(report.processed.length, 0); assert.deepEqual(report.errors, []); }
      assert.equal((await db.query('SELECT status FROM sns.posts')).rows[0].status, 'sent');
    } finally { workers.forEach(worker => worker.stop()); }
  });
  await t.test('native: two locked workers take different posts with limit 1 and each publish once', async () => {
    await seed();
    await db.exec(`INSERT INTO sns.posts (id,status,created_at,target_sns,is_historical,is_publishable,feature_published,media_urls,title,body_text)
      SELECT '00000000-0000-0000-0000-000000000002'::uuid,status,created_at,target_sns,is_historical,is_publishable,feature_published,media_urls,title,body_text FROM sns.posts;`);
    const workers = [startWorker(db.connection, true), startWorker(db.connection, true)];
    try {
      const claims = await Promise.all(workers.map(worker => worker.wait('claim')));
      assert.equal(claims[0].ids.length, 1); assert.equal(claims[1].ids.length, 1);
      assert.notEqual(claims[0].ids[0], claims[1].ids[0]);
      workers.forEach(worker => worker.release());
      const results = await Promise.all(workers.map(worker => worker.wait('done')));
      for (const result of results) { assert.equal(result.mockCreates, 1); assert.deepEqual(result.report.errors, []); }
      const counts = (await db.query('SELECT count(*)::int AS n, count(DISTINCT external_post_id)::int AS ids FROM sns.posts WHERE external_post_id IS NOT NULL')).rows[0];
      assert.deepEqual(counts, { n: 2, ids: 2 });
    } finally { workers.forEach(worker => { worker.release(); worker.stop(); }); }
  });
};
