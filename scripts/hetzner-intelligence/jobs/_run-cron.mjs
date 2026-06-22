const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.collectorsintelligence.com';

export async function runCronJob(name, path) {
  const url = `${baseUrl}${path}`;
  const started = new Date();

  console.log(`\n▶ ${name}`);
  console.log(`URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Collector-Intelligence-Hetzner-Engine'
    }
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`❌ ${name} failed`);
    console.error(`Status: ${response.status}`);
    console.error(text.slice(0, 2000));
    process.exit(1);
  }

  const elapsed = Math.round((Date.now() - started.getTime()) / 1000);

  console.log(`✅ ${name} completed in ${elapsed}s`);
  console.log(text.slice(0, 2000));
}
