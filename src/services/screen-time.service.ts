import { eq, and, sql, desc, gte, lte, inArray } from "drizzle-orm";
import { db } from "../config/database";
import { screenTimeLogs, screenTimeLimits, users, habits, habitCompletions } from "../db/schema";
import { AppError } from "../middleware/error-handler";
import { getAppCategory, getAppName } from "../utils/app-categories";

type SyncLogItem = {
  appPackageName: string;
  appName?: string;
  usageDate: string;
  usageMinutes: number;
  openCount?: number;
};

export async function syncLogs(userId: string, logs: SyncLogItem[]) {
  let synced = 0;

  for (const log of logs) {
    const category = getAppCategory(log.appPackageName);
    const appName = log.appName ?? getAppName(log.appPackageName);

    await db
      .insert(screenTimeLogs)
      .values({
        userId,
        appPackageName: log.appPackageName,
        appName,
        appCategory: category,
        usageDate: log.usageDate,
        usageMinutes: log.usageMinutes,
        openCount: log.openCount ?? 0,
      })
      .onConflictDoUpdate({
        target: [screenTimeLogs.userId, screenTimeLogs.appPackageName, screenTimeLogs.usageDate],
        set: {
          usageMinutes: sql`EXCLUDED.usage_minutes`,
          openCount: sql`EXCLUDED.open_count`,
          appName: sql`COALESCE(EXCLUDED.app_name, ${screenTimeLogs.appName})`,
          appCategory: sql`EXCLUDED.app_category`,
        },
      });

    synced++;
  }

  return { synced };
}

export async function getTodayUsage(userId: string) {
  const [user] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId));

  const tz = user?.timezone ?? "Asia/Jakarta";

  const todayDateResult = await db
    .select({ today: sql<string>`(CURRENT_DATE AT TIME ZONE ${tz})::date` })
    .from(sql` (SELECT 1) as _ `)
    .limit(1);

  const todayDate = todayDateResult[0]?.today!;

  const rows = await db
    .select({
      appPackageName: screenTimeLogs.appPackageName,
      appName: screenTimeLogs.appName,
      appCategory: screenTimeLogs.appCategory,
      usageMinutes: sql<number>`cast(sum(${screenTimeLogs.usageMinutes}) as int)`,
      openCount: sql<number>`cast(sum(${screenTimeLogs.openCount}) as int)`,
    })
    .from(screenTimeLogs)
    .where(
      and(
        eq(screenTimeLogs.userId, userId),
        eq(screenTimeLogs.usageDate, todayDate)
      )
    )
    .groupBy(screenTimeLogs.appPackageName, screenTimeLogs.appName, screenTimeLogs.appCategory)
    .orderBy(desc(sql`sum(${screenTimeLogs.usageMinutes})`));

  return rows.map((row) => ({
    appPackageName: row.appPackageName,
    appName: row.appName,
    appCategory: row.appCategory,
    usageMinutes: row.usageMinutes,
    openCount: row.openCount,
  }));
}

export async function getDailyTotals(userId: string, from: string, to: string) {
  const rows = await db
    .select({
      usageDate: screenTimeLogs.usageDate,
      totalMinutes: sql<number>`cast(sum(${screenTimeLogs.usageMinutes}) as int)`,
    })
    .from(screenTimeLogs)
    .where(
      and(
        eq(screenTimeLogs.userId, userId),
        gte(screenTimeLogs.usageDate, from),
        lte(screenTimeLogs.usageDate, to)
      )
    )
    .groupBy(screenTimeLogs.usageDate)
    .orderBy(screenTimeLogs.usageDate);

  return rows.map((row) => ({
    usageDate: row.usageDate,
    totalMinutes: row.totalMinutes,
  }));
}

export async function getByApp(userId: string, from: string, to: string) {
  const rows = await db
    .select({
      appPackageName: screenTimeLogs.appPackageName,
      appName: screenTimeLogs.appName,
      appCategory: screenTimeLogs.appCategory,
      totalMinutes: sql<number>`cast(sum(${screenTimeLogs.usageMinutes}) as int)`,
      totalOpenCount: sql<number>`cast(sum(${screenTimeLogs.openCount}) as int)`,
    })
    .from(screenTimeLogs)
    .where(
      and(
        eq(screenTimeLogs.userId, userId),
        gte(screenTimeLogs.usageDate, from),
        lte(screenTimeLogs.usageDate, to)
      )
    )
    .groupBy(screenTimeLogs.appPackageName, screenTimeLogs.appName, screenTimeLogs.appCategory)
    .orderBy(desc(sql`sum(${screenTimeLogs.usageMinutes})`));

  return rows.map((row) => ({
    appPackageName: row.appPackageName,
    appName: row.appName,
    appCategory: row.appCategory,
    totalMinutes: row.totalMinutes,
    totalOpenCount: row.totalOpenCount,
  }));
}

export async function getByCategory(userId: string, from: string, to: string) {
  const rows = await db
    .select({
      appCategory: screenTimeLogs.appCategory,
      totalMinutes: sql<number>`cast(sum(${screenTimeLogs.usageMinutes}) as int)`,
      appCount: sql<number>`cast(count(distinct ${screenTimeLogs.appPackageName}) as int)`,
    })
    .from(screenTimeLogs)
    .where(
      and(
        eq(screenTimeLogs.userId, userId),
        gte(screenTimeLogs.usageDate, from),
        lte(screenTimeLogs.usageDate, to)
      )
    )
    .groupBy(screenTimeLogs.appCategory)
    .orderBy(desc(sql`sum(${screenTimeLogs.usageMinutes})`));

  return rows.map((row) => ({
    appCategory: row.appCategory,
    totalMinutes: row.totalMinutes,
    appCount: row.appCount,
  }));
}

export async function getCorrelation(userId: string) {
  const habitDays = await db
    .select({
      completedDate: habitCompletions.completedDate,
    })
    .from(habitCompletions)
    .where(eq(habitCompletions.userId, userId));

  const [activeHabitsRow] = await db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));
  const totalHabits = activeHabitsRow?.total ?? 0;

  if (totalHabits === 0 || habitDays.length === 0) {
    return {
      perfectDayAvgMinutes: null,
      lowDayAvgMinutes: null,
      differencePercent: null,
    };
  }

  const completionsPerDay = new Map<string, number>();
  for (const h of habitDays) {
    const d = h.completedDate;
    completionsPerDay.set(d, (completionsPerDay.get(d) ?? 0) + 1);
  }

  const perfectDays: string[] = [];
  const lowDays: string[] = [];
  for (const [date, count] of completionsPerDay) {
    const rate = count / totalHabits;
    if (rate >= 1) perfectDays.push(date);
    else if (rate < 0.5) lowDays.push(date);
  }

  const avgScreenTimeForDates = async (dates: string[]): Promise<number | null> => {
    if (dates.length === 0) return null;
    const dailyTotals = await db
      .select({
        totalMinutes: sql<number>`cast(sum(${screenTimeLogs.usageMinutes}) as int)`,
      })
      .from(screenTimeLogs)
      .where(
        and(
          eq(screenTimeLogs.userId, userId),
          inArray(screenTimeLogs.usageDate, dates)
        )
      )
      .groupBy(screenTimeLogs.usageDate);

    if (dailyTotals.length === 0) return null;
    const sum = dailyTotals.reduce((acc, row) => acc + row.totalMinutes, 0);
    return sum / dailyTotals.length;
  };

  const perfectDayAvg = await avgScreenTimeForDates(perfectDays);
  const lowDayAvg = await avgScreenTimeForDates(lowDays);

  let differencePercent: number | null = null;
  if (perfectDayAvg !== null && lowDayAvg !== null && lowDayAvg > 0) {
    differencePercent = Math.round(((lowDayAvg - perfectDayAvg) / lowDayAvg) * 100 * 10) / 10;
  }

  return {
    perfectDayAvgMinutes: perfectDayAvg,
    lowDayAvgMinutes: lowDayAvg,
    differencePercent,
  };
}

export async function createLimit(
  userId: string,
  data: { appPackageName?: string; category?: string; limitMinutes: number; isActive?: boolean }
) {
  const [limit] = await db
    .insert(screenTimeLimits)
    .values({
      userId,
      appPackageName: data.appPackageName,
      category: data.category,
      limitMinutes: data.limitMinutes,
      isActive: data.isActive ?? true,
    })
    .returning();

  if (!limit) throw new AppError("Failed to create limit", 500);
  return limit;
}

export async function getLimits(userId: string) {
  return db
    .select()
    .from(screenTimeLimits)
    .where(eq(screenTimeLimits.userId, userId))
    .orderBy(desc(screenTimeLimits.createdAt));
}

export async function updateLimit(
  userId: string,
  limitId: string,
  data: { limitMinutes?: number; isActive?: boolean }
) {
  const [existing] = await db
    .select({ id: screenTimeLimits.id })
    .from(screenTimeLimits)
    .where(and(eq(screenTimeLimits.id, limitId), eq(screenTimeLimits.userId, userId)));

  if (!existing) throw new AppError("Limit not found", 404);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.limitMinutes !== undefined) updateData.limitMinutes = data.limitMinutes;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(screenTimeLimits)
    .set(updateData)
    .where(eq(screenTimeLimits.id, limitId))
    .returning();

  return updated;
}

export async function deleteLimit(userId: string, limitId: string) {
  const deleted = await db
    .delete(screenTimeLimits)
    .where(and(eq(screenTimeLimits.id, limitId), eq(screenTimeLimits.userId, userId)))
    .returning();

  if (deleted.length === 0) throw new AppError("Limit not found", 404);
}
