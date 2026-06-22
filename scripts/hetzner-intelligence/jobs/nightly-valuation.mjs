import { runCronJob } from './_run-cron.mjs';

await runCronJob('Nightly Valuation', '/api/cron/value-intelligence');
