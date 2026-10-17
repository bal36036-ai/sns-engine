const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--test', 'test-dispatch-guard.cjs'], {
  cwd: __dirname, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, SNS_TEST_NATIVE: '1' },
});
process.exitCode = result.status ?? 1;
