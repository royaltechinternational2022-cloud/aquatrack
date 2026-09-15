/**
 * Standalone cron entry point for environments without a platform-managed
 * scheduler (e.g. Vercel Cron). Run this on an interval (every 5-15 minutes
 * is plenty, see src/app/api/cron/reports/route.ts for why) via a system
 * crontab, pm2, or `npm run cron:reports` in a loop.
 */
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

async function main() {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET is not set");
    process.exit(1);
  }
  const res = await fetch(`${APP_URL}/api/cron/reports`, {
    method: "POST",
    headers: { "x-cron-secret": CRON_SECRET },
  });
  const data = await res.json();
  console.log(new Date().toISOString(), JSON.stringify(data));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
