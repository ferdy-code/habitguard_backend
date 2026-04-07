import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../config/database";
import {
  dailySummaries,
  habitCompletions,
  habits,
  screenTimeLogs,
  focusSessions,
  users,
} from "../db/schema";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function getUserTimezone(userId: string): Promise<string> {
  const [user] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId));
  return user?.timezone ?? "Asia/Jakarta";
}

async function getLocalDate(
  userId: string,
  dateOverride?: string,
): Promise<string> {
  if (dateOverride) return dateOverride;

  const tz = await getUserTimezone(userId);
  const [result] = await db
    .select({
      date: sql<string>`(CURRENT_DATE AT TIME ZONE ${tz})::text`,
    })
    .from(sql` (SELECT 1) as _ `)
    .limit(1);
  return result!.date!;
}

async function getHabitStatsForDate(
  userId: string,
  date: string,
): Promise<{ completed: number; total: number }> {
  const [totalRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));

  const [completedRow] = await db
    .select({
      count: sql<number>`cast(count(distinct ${habitCompletions.habitId}) as int)`,
    })
    .from(habitCompletions)
    .innerJoin(habits, eq(habitCompletions.habitId, habits.id))
    .where(
      and(
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.completedDate, date),
        eq(habits.isArchived, false),
      ),
    );

  return {
    completed: completedRow?.count ?? 0,
    total: totalRow?.count ?? 0,
  };
}

async function getScreenTimeForDate(
  userId: string,
  date: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`cast(coalesce(sum(${screenTimeLogs.usageMinutes}), 0) as int)`,
    })
    .from(screenTimeLogs)
    .where(
      and(
        eq(screenTimeLogs.userId, userId),
        eq(screenTimeLogs.usageDate, date),
      ),
    );

  return row?.total ?? 0;
}

async function getFocusMinutesForDate(
  userId: string,
  date: string,
): Promise<number> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const [row] = await db
    .select({
      total: sql<number>`cast(coalesce(sum(${focusSessions.completedMinutes}), 0) as int)`,
    })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(focusSessions.status, "completed"),
        gte(focusSessions.startedAt, new Date(startOfDay)),
        lte(focusSessions.startedAt, new Date(endOfDay)),
      ),
    );

  return row?.total ?? 0;
}

async function generateAIInsight(data: {
  date: string;
  habitsCompleted: number;
  habitsTotal: number;
  completionRate: string;
  totalScreenMinutes: number;
  focusMinutes: number;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Kamu adalah AI coach untuk aplikasi habit tracker bernama HabitGuard. Berikan insight singkat (2-3 kalimat) dalam Bahasa Indonesia untuk ringkasan harian user.

Data hari ini (${data.date}):
- Kebiasaan selesai: ${data.habitsCompleted}/${data.habitsTotal} (${data.completionRate}%)
- Total screen time: ${data.totalScreenMinutes} menit
- Focus session: ${data.focusMinutes} menit

Beri motivasi dan saran konkret. Jangan gunakan emoji. Langsung ke isi insight, tanpa pembuka.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("[SummaryService] AI insight generation failed:", err);
    return "Ringkasan harian berhasil dibuat. Terus jaga konsistensi kebiasaan dan screen time kamu!";
  }
}

export async function generateDailySummary(
  userId: string,
  dateOverride?: string,
) {
  const date = await getLocalDate(userId, dateOverride);

  const [habitStats, totalScreenMinutes, focusMinutes] = await Promise.all([
    getHabitStatsForDate(userId, date),
    getScreenTimeForDate(userId, date),
    getFocusMinutesForDate(userId, date),
  ]);

  const completionRate =
    habitStats.total > 0
      ? ((habitStats.completed / habitStats.total) * 100).toFixed(2)
      : "0.00";

  const aiInsight = await generateAIInsight({
    date,
    habitsCompleted: habitStats.completed,
    habitsTotal: habitStats.total,
    completionRate,
    totalScreenMinutes,
    focusMinutes,
  });

  const [summary] = await db
    .insert(dailySummaries)
    .values({
      userId,
      summaryDate: date,
      totalScreenMinutes,
      habitsCompleted: habitStats.completed,
      habitsTotal: habitStats.total,
      completionRate,
      focusMinutes,
      aiInsight,
      aiGeneratedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [dailySummaries.userId, dailySummaries.summaryDate],
      set: {
        totalScreenMinutes,
        habitsCompleted: habitStats.completed,
        habitsTotal: habitStats.total,
        completionRate,
        focusMinutes,
        aiInsight,
        aiGeneratedAt: new Date(),
      },
    })
    .returning();

  return summary;
}

export async function getTodaySummary(userId: string, timezone?: string) {
  const tz = timezone ?? (await getUserTimezone(userId));

  const [dateResult] = await db
    .select({
      date: sql<string>`(CURRENT_DATE AT TIME ZONE ${tz})::text`,
    })
    .from(sql` (SELECT 1) as _ `)
    .limit(1);
  const todayDate = dateResult!.date;

  const [existing] = await db
    .select()
    .from(dailySummaries)
    .where(
      and(
        eq(dailySummaries.userId, userId),
        eq(dailySummaries.summaryDate, todayDate),
      ),
    );
  if (existing) return existing;

  return generateDailySummary(userId, todayDate.split(" ")[0]);
}

export async function getSummaries(userId: string, from: string, to: string) {
  return db
    .select()
    .from(dailySummaries)
    .where(
      and(
        eq(dailySummaries.userId, userId),
        gte(dailySummaries.summaryDate, from),
        lte(dailySummaries.summaryDate, to),
      ),
    )
    .orderBy(desc(dailySummaries.summaryDate));
}

export async function getActiveUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isActive, true));
  return rows.map((r) => r.id);
}
