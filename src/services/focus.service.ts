import { eq, and, sql, desc, gte, lte, count } from "drizzle-orm";
import { db } from "../config/database";
import { focusSessions } from "../db/schema";
import { AppError } from "../middleware/error-handler";

export async function saveSession(
  userId: string,
  data: {
    durationMinutes: number;
    completedMinutes: number;
    sessionType: string;
    status: string;
    blockedApps?: string[];
    startedAt: string;
    endedAt?: string;
  }
) {
  const [session] = await db
    .insert(focusSessions)
    .values({
      userId,
      durationMinutes: data.durationMinutes,
      completedMinutes: data.completedMinutes,
      sessionType: data.sessionType as any,
      status: data.status as any,
      blockedApps: data.blockedApps,
      startedAt: new Date(data.startedAt),
      endedAt: data.endedAt ? new Date(data.endedAt) : new Date(),
    })
    .returning();

  if (!session) throw new AppError("Failed to save session", 500);
  return session;
}

export async function getSessions(
  userId: string,
  opts?: { from?: string; to?: string; page?: number; limit?: number }
) {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(focusSessions.userId, userId)];
  if (opts?.from) conditions.push(gte(focusSessions.startedAt, new Date(opts.from)));
  if (opts?.to) conditions.push(lte(focusSessions.startedAt, new Date(opts.to + "T23:59:59")));

  const [sessions, totalResult] = await Promise.all([
    db
      .select()
      .from(focusSessions)
      .where(and(...conditions))
      .orderBy(desc(focusSessions.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(focusSessions)
      .where(and(...conditions)),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return {
    sessions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getStats(userId: string) {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

  const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

  const [today, week, month] = await Promise.all([
    db
      .select({
        totalMinutes: sql<number>`cast(coalesce(sum(${focusSessions.completedMinutes}), 0) as int)`,
        sessionCount: sql<number>`cast(count(*) as int)`,
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          eq(focusSessions.status, "completed"),
          gte(focusSessions.startedAt, startOfToday)
        )
      ),
    db
      .select({
        totalMinutes: sql<number>`cast(coalesce(sum(${focusSessions.completedMinutes}), 0) as int)`,
        sessionCount: sql<number>`cast(count(*) as int)`,
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          eq(focusSessions.status, "completed"),
          gte(focusSessions.startedAt, startOfWeek)
        )
      ),
    db
      .select({
        totalMinutes: sql<number>`cast(coalesce(sum(${focusSessions.completedMinutes}), 0) as int)`,
        sessionCount: sql<number>`cast(count(*) as int)`,
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          eq(focusSessions.status, "completed"),
          gte(focusSessions.startedAt, startOfMonth)
        )
      ),
  ]);

  return {
    todayMinutes: today[0]?.totalMinutes ?? 0,
    weekMinutes: week[0]?.totalMinutes ?? 0,
    monthMinutes: month[0]?.totalMinutes ?? 0,
    todaySessions: today[0]?.sessionCount ?? 0,
    weekSessions: week[0]?.sessionCount ?? 0,
    monthSessions: month[0]?.sessionCount ?? 0,
  };
}
