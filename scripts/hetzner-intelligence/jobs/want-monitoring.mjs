import { runCronJob } from './_run-cron.mjs';

await runCronJob('Want Intelligence Sync', '/api/cron/want-intelligence-sync');
