import { runCronJob } from './_run-cron.mjs';

await runCronJob('Market Trends', '/api/cron/market-trends');
