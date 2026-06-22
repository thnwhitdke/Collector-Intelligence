import { spawnSync } from 'node:child_process';

const jobs = [
  'nightly-valuation.mjs',
  'market-memory.mjs',
  'artist-snapshots.mjs',
  'ownership-intelligence.mjs',
  'recommendations.mjs',
  'anomaly-detection.mjs',
  'want-monitoring.mjs'
];

console.log('\n🧠 COLLECTOR INTELLIGENCE — HETZNER ENGINE\n');

for (const job of jobs) {
  console.log(`\n▶ Running ${job}`);
  const result = spawnSync('node', [`scripts/hetzner-intelligence/jobs/${job}`], {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    console.error(`\n❌ Failed: ${job}`);
    process.exit(result.status ?? 1);
  }

  console.log(`✅ Completed ${job}`);
}

console.log('\n🎉 Hetzner Intelligence run complete\n');
