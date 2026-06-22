import { runCronJob } from './_run-cron.mjs';

await runCronJob('Artist Market Snapshot', '/api/cron/artist-market-snapshot');
