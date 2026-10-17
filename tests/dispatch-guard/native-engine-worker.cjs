// Independent Node process running unchanged production engine code against a temporary local DB.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Pool } = require('pg');
process.once('message', async ({ connection, holdAfterClaim, limit }) => {
  if (connection.host !== '127.0.0.1' || connection.database !== 'postgres' || connection.user !== 'local_test_owner') {
    throw new Error('Worker refuses any connection except the synthetic local test database');
  }
  let mockCreates = 0;
  let backendPid;
  const pool = new Pool({ ...connection, password: '', ssl: false, max: 1 });
  const context = { module: { exports: {} }, Date, console, process: { env: {} },
    require(name) {
      if (name === './db-client') return { getPool: () => ({
        async connect() {
          const client = await pool.connect();
          backendPid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
          return { release: () => client.release(), async query(sql, values) {
            const result = await client.query(sql, values);
            if (sql.includes('SELECT id FROM sns.posts')) {
              process.send({ type: 'claim', ids: result.rows.map(r => r.id), backendPid });
              if (holdAfterClaim && result.rows.length) {
                await new Promise(resolve => process.once('message', message => {
                  if (message.type !== 'release') throw new Error('Unexpected worker message');
                  resolve();
                }));
              }
            }
            return result;
          } };
        }, end: () => pool.end(),
      }) };
      if (name === 'https') return { request(url, options, done) {
        return { on() {}, end() { done({ statusCode: 200 }); } };
      } };
      if (name === './threads-client') return {};
      if (name === './buffer-channels') return { CHANNEL_MAP: { youtube: 'synthetic-channel' },
        ACTIVE_BUFFER_MAP: { youtube: 'synthetic-channel' }, PAUSED_SNS: ['instagram'],
        TEXT_ONLY_SNS: [], AUTOMATED_SNS: ['youtube'] };
      if (name === './buffer-client') return {
        findDuplicatePost: async () => null,
        createPost: async () => { mockCreates++; return { id: `synthetic-buffer-${process.pid}`, status: 'sending' }; },
        getPost: async id => ({ id, channelId: 'synthetic-channel', status: 'sent',
          sentAt: new Date().toISOString(), externalLink: 'https://example.test/synthetic-post' }),
      };
      throw new Error(`Forbidden dependency: ${name}`);
    } };
  try {
    const source = fs.readFileSync(path.resolve(__dirname, '../../cron-engine.js'), 'utf8');
    vm.runInNewContext(source, context);
    const report = await context.module.exports.runCronEngine({ dryRun: false, limit });
    process.send({ type: 'done', mockCreates, backendPid, workerPid: process.pid, report }, () => process.disconnect());
  } catch (error) {
    await pool.end().catch(() => {});
    process.send({ type: 'error', error: error.message }, () => { process.exitCode = 1; process.disconnect(); });
  }
});
