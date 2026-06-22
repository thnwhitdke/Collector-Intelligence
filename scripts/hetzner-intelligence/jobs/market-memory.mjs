import { runCronJob } from './_run-cron.mjs';

await runCronJob('Market Memory Snapshot', '/api/cron/value-history-snapshot');
