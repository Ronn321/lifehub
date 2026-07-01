/* eslint-disable */
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--import', 'tsx', __dirname + '/reset.ts'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
