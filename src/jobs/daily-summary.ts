import {
  generateDailySummary,
  getActiveUserIds,
} from "../services/summary.service";

async function runDailySummaryJob() {
  console.log("[SummaryCron] Starting daily summary generation...");
  const userIds = await getActiveUserIds();

  let processed = 0;
  let errors = 0;

  for (const userId of userIds) {
    try {
      await generateDailySummary(userId);
      processed++;
    } catch (err) {
      errors++;
      console.error(`[SummaryCron] Error for user ${userId}:`, err);
    }
  }

  console.log(
    `[SummaryCron] Completed. Processed: ${processed}, Errors: ${errors}`,
  );
}

function msUntilNext10PMUTC(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(22, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function startDailySummaryCron() {
  const scheduleNext = () => {
    const delay = msUntilNext10PMUTC();
    setTimeout(async () => {
      await runDailySummaryJob();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  console.log("[SummaryCron] Daily summary generation scheduled at 10:00 PM UTC");
}

export { runDailySummaryJob };
