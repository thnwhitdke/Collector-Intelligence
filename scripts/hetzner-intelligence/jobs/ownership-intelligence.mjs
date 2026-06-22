import { runCronJob } from './_run-cron.mjs';

await runCronJob('Recompute Intelligence', '/api/cron/recompute-intelligence');
