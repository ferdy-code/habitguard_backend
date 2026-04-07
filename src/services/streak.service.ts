import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../config/database";
import { habits, habitCompletions, habitStreaks } from "../db/schema";
import { AppError } from "../middleware/error-handler";
import { verifyHabitOwnership } from "./habit.service";

export async function completeHabit(
  userId: string,
  habitId: string,
  opts?: { date?: string; count?: number; notes?: string }
) {
  await verifyHabitOwnership(userId, habitId);

  const completedDate = opts?.date ?? new Date().toISOString().split("T")[0]!;
  const count = opts?.count ?? 1;

  const insertData: Record<string, unknown> = {
    habitId,
    userId,
    completedDate,
    count,
  };
  if (opts?.notes !== undefined) {
    insertData.notes = opts.notes;
  }

  const result = await db
    .insert(habitCompletions)
    .values(insertData as any)
    .onConflictDoUpdate({
      target: [habitCompletions.habitId, habitCompletions.completedDate],
      set: {
        count: sql`EXCLUDED.count`,
        notes: sql`COALESCE(EXCLUDED.notes, ${habitCompletions.notes})`,
      },
    })
    .returning();

  await recalculateStreak(habitId);

  return result[0];
}

export async function undoCompletion(userId: string, habitId: string, date: string) {
  await verifyHabitOwnership(userId, habitId);

  const deleted = await db
    .delete(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.completedDate, date)
      )
    )
    .returning();

  if (deleted.length === 0) {
    throw new AppError("Completion not found for the given date", 404);
  }

  await recalculateStreak(habitId);

  return { deleted: true };
}

export async function recalculateStreak(habitId: string) {
  const [habit] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, habitId));

  if (!habit) return;

  const completions = await db
    .select({ completedDate: habitCompletions.completedDate })
    .from(habitCompletions)
    .where(eq(habitCompletions.habitId, habitId))
    .orderBy(desc(habitCompletions.completedDate));

  if (completions.length === 0) {
    await db
      .update(habitStreaks)
      .set({ currentStreak: 0, longestStreak: sql`GREATEST(longest_streak, 0)`, updatedAt: new Date() })
      .where(eq(habitStreaks.habitId, habitId));
    return;
  }

  const completionDates = new Set(completions.map((c) => c.completedDate));

  let streak = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0]!;

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0]!;

  let startDate: Date;
  if (completionDates.has(todayStr)) {
    startDate = new Date(today);
  } else {
    startDate = new Date(yesterday);
  }

  let currentDate = new Date(startDate);
  const earliestCompletion = completions[completions.length - 1]!.completedDate;

  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0]!;

    if (habit.frequency === "custom" && habit.customDays !== null && habit.customDays !== undefined) {
      const dayOfWeek = currentDate.getUTCDay();
      const dayBit = dayOfWeek === 0 ? 64 : 1 << (dayOfWeek - 1);

      if ((habit.customDays & dayBit) === 0) {
        currentDate.setUTCDate(currentDate.getUTCDate() - 1);
        if (dateStr <= earliestCompletion) break;
        continue;
      }
    }

    if (completionDates.has(dateStr)) {
      streak++;
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    } else {
      break;
    }

    if (habit.frequency === "weekly") {
      currentDate.setUTCDate(currentDate.getUTCDate() - 6);
    }
  }

  const [existingStreak] = await db
    .select()
    .from(habitStreaks)
    .where(eq(habitStreaks.habitId, habitId));

  const longestStreak = Math.max(existingStreak?.longestStreak ?? 0, streak);
  const lastCompletedDate = completions[0]?.completedDate ?? null;

  await db
    .update(habitStreaks)
    .set({
      currentStreak: streak,
      longestStreak,
      lastCompletedDate,
      updatedAt: new Date(),
    })
    .where(eq(habitStreaks.habitId, habitId));
}

export async function getCompletions(
  habitId: string,
  opts?: { from?: string; to?: string }
) {
  const conditions = [eq(habitCompletions.habitId, habitId)];

  if (opts?.from) {
    conditions.push(sql`${habitCompletions.completedDate} >= ${opts.from}`);
  }
  if (opts?.to) {
    conditions.push(sql`${habitCompletions.completedDate} <= ${opts.to}`);
  }

  return db
    .select()
    .from(habitCompletions)
    .where(and(...conditions))
    .orderBy(desc(habitCompletions.completedDate));
}
