/* eslint-disable */
// CommonJS-Wrapper, weil `nest build` per Default CJS-Output erzeugt
// und `import.meta` in CJS nicht verfügbar ist.
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--import', 'tsx', __dirname + '/migrate.ts'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
