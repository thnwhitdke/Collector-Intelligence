import { spawnSync } from 'node:child_process';

console.log('▶ Warehouse Intelligence V2');
console.log('Processing 500,000 warehouse intelligence rows');

const result = spawnSync('npm', ['run', 'warehouse:intelligence:v2'], {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    BATCH_SIZE: process.env.BATCH_SIZE || '5000',
    MAX_BATCHES: process.env.MAX_BATCHES || '100'
  }
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
