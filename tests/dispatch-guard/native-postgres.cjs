const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { Client, types } = require('pg');
// Test fixtures only use small bigint request IDs.
types.setTypeParser(20, Number);

class NativePostgres {
  constructor() {
    this.native = true;
    this.ready = this.start();
  }
  async start() {
    const packageRoot = process.platform === 'win32'
      ? path.dirname(path.dirname(require.resolve('@embedded-postgres/windows-x64'))) : null;
    this.bin = process.env.SNS_TEST_PG_BIN || (packageRoot && path.join(packageRoot, 'native', 'bin'));
    if (!this.bin) throw new Error('Set SNS_TEST_PG_BIN to an existing local PostgreSQL bin directory');
    const executable = name => path.join(this.bin, name + (process.platform === 'win32' ? '.exe' : ''));
    this.exe = executable;
    this.directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sns-dispatch-native-'));
    this.data = path.join(this.directory, 'data');
    const init = spawnSync(executable('initdb'), ['-D', this.data, '-U', 'local_test_owner', '-A', 'trust', '--encoding=UTF8', '--no-locale'],
      { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    if (init.status !== 0) throw new Error(`Local initdb failed: ${init.error?.message || init.stderr}`);
    const port = await new Promise((resolve, reject) => {
      const probe = net.createServer(); probe.on('error', reject);
      probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
    });
    this.connection = { host: '127.0.0.1', port, user: 'local_test_owner', database: 'postgres',
      password: '', ssl: false, connectionTimeoutMillis: 1500, application_name: 'sns-dispatch-local-test' };
    this.server = spawn(executable('postgres'), ['-D', this.data, '-h', '127.0.0.1', '-p', String(port),
      '-c', 'max_connections=15', '-c', 'fsync=off'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    this.serverError = null;
    this.server.on('error', e => { this.serverError = e; });
    this.server.stdout.on('data', () => {});
    this.server.stderr.on('data', () => {});
    for (let attempt = 0; attempt < 80; attempt++) {
      if (this.serverError) throw this.serverError;
      const client = new Client(this.connection);
      try { await client.connect(); this.client = client; return; }
      catch (error) {
        await client.end().catch(() => {});
        if (attempt === 79) throw error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  async query(sql, values) { await this.ready; return this.client.query(sql, values); }
  async exec(sql) { return this.query(sql); }
  async transaction(fn) {
    await this.exec('BEGIN');
    try { const result = await fn(this); await this.exec('COMMIT'); return result; }
    catch (error) { await this.exec('ROLLBACK'); throw error; }
  }
  async openClient() { await this.ready; const client = new Client(this.connection); await client.connect(); return client; }
  async close() {
    await this.ready.catch(() => {});
    if (this.client) await this.client.end();
    if (this.data && this.exe && fs.existsSync(path.join(this.data, 'postmaster.pid'))) {
      const stop = spawnSync(this.exe('pg_ctl'), ['-D', this.data, '-m', 'fast', '-w', 'stop'],
        { encoding: 'utf8', windowsHide: true, timeout: 15000 });
      if (stop.status !== 0) throw new Error('Failed to stop the temporary local PostgreSQL server');
    }
    if (this.server) await new Promise(resolve => { if (this.server.exitCode !== null) resolve(); else this.server.once('exit', resolve); });
    if (this.directory) {
      const target = fs.realpathSync(this.directory);
      const parent = fs.realpathSync(os.tmpdir());
      if (path.dirname(target) !== parent || !path.basename(target).startsWith('sns-dispatch-native-')) {
        throw new Error('Refusing to remove an unexpected temporary DB directory');
      }
      fs.rmSync(target, { recursive: true, force: false });
    }
  }
}
module.exports = NativePostgres;
