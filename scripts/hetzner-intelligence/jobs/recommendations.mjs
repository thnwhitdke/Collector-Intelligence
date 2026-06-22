import { runCronJob } from './_run-cron.mjs';

await runCronJob('Market Observations', '/api/cron/market-observations');
