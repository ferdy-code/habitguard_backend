import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { habits } from "../db/schema";
import { recalculateStreak } from "../services/streak.service";

async function runStreakCalculation() {
  console.log("[StreakCron] Starting daily streak recalculation...");

  const activeHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.isArchived, false));

  let processed = 0;
  let errors = 0;

  for (const habit of activeHabits) {
    try {
      await recalculateStreak(habit.id);
      processed++;
    } catch (err) {
      errors++;
      console.error(`[StreakCron] Error processing habit ${habit.id}:`, err);
    }
  }

  console.log(
    `[StreakCron] Completed. Processed: ${processed}, Errors: ${errors}`
  );
}

function msUntilNext1AMUTC(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(1, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function startStreakCronJob() {
  const scheduleNext = () => {
    const delay = msUntilNext1AMUTC();
    setTimeout(async () => {
      await runStreakCalculation();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  console.log("[StreakCron] Daily streak recalculation scheduled at 1:00 AM UTC");
}

export { runStreakCalculation };
