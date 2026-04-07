import { eq, and, sql } from "drizzle-orm";
import { db } from "../config/database";
import { habits, habitStreaks, habitCompletions } from "../db/schema";
import { AppError } from "../middleware/error-handler";

type CreateHabitData = {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency: "daily" | "weekly" | "custom";
  customDays?: number;
  targetCount?: number;
  reminderTime?: string;
  reminderEnabled?: boolean;
  category?: string;
};

type UpdateHabitData = Partial<CreateHabitData> & {
  isArchived?: boolean;
};

export async function createHabit(userId: string, data: CreateHabitData) {
  const [habit] = await db
    .insert(habits)
    .values({
      userId,
      title: data.title,
      description: data.description,
      icon: data.icon,
      color: data.color,
      frequency: data.frequency,
      customDays: data.customDays,
      targetCount: data.targetCount,
      reminderTime: data.reminderTime,
      reminderEnabled: data.reminderEnabled,
      category: data.category,
    })
    .returning();

  if (!habit) {
    throw new AppError("Failed to create habit", 500);
  }

  await db.insert(habitStreaks).values({
    habitId: habit.id,
    userId,
    currentStreak: 0,
    longestStreak: 0,
  });

  const streakResult = await db
    .select()
    .from(habitStreaks)
    .where(eq(habitStreaks.habitId, habit.id));

  return {
    ...habit,
    streak: streakResult[0] ?? null,
  };
}

export async function getHabits(userId: string, opts?: { archived?: boolean }) {
  const conditions = [eq(habits.userId, userId)];

  if (opts?.archived !== undefined) {
    conditions.push(eq(habits.isArchived, opts.archived));
  } else {
    conditions.push(eq(habits.isArchived, false));
  }

  const rows = await db
    .select({
      habit: habits,
      streak: habitStreaks,
    })
    .from(habits)
    .leftJoin(habitStreaks, eq(habits.id, habitStreaks.habitId))
    .where(and(...conditions))
    .orderBy(habits.sortOrder, habits.createdAt);

  return rows.map((row) => ({
    ...row.habit,
    streak: row.streak ?? null,
  }));
}

export async function getHabitById(userId: string, habitId: string) {
  const [row] = await db
    .select({
      habit: habits,
      streak: habitStreaks,
    })
    .from(habits)
    .leftJoin(habitStreaks, eq(habits.id, habitStreaks.habitId))
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));

  if (!row) {
    throw new AppError("Habit not found", 404);
  }

  const stats = await getHabitStats(habitId);

  return {
    ...row.habit,
    streak: row.streak ?? null,
    stats,
  };
}

async function getHabitStats(habitId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [stats7d] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        sql`${habitCompletions.completedDate} >= ${fmt(sevenDaysAgo)}`,
      ),
    );

  const [stats30d] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        sql`${habitCompletions.completedDate} >= ${fmt(thirtyDaysAgo)}`,
      ),
    );

  const [total] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(habitCompletions)
    .where(eq(habitCompletions.habitId, habitId));

  return {
    completionRate7d: Math.min((stats7d?.count ?? 0) / 7, 1),
    completionRate30d: Math.min((stats30d?.count ?? 0) / 30, 1),
    totalCompletions: total?.count ?? 0,
  };
}

export async function updateHabit(
  userId: string,
  habitId: string,
  data: UpdateHabitData,
) {
  const [existing] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));

  if (!existing) {
    throw new AppError("Habit not found", 404);
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.customDays !== undefined) updateData.customDays = data.customDays;
  if (data.targetCount !== undefined) updateData.targetCount = data.targetCount;
  if (data.reminderTime !== undefined)
    updateData.reminderTime = data.reminderTime;
  if (data.reminderEnabled !== undefined)
    updateData.reminderEnabled = data.reminderEnabled;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

  const [updated] = await db
    .update(habits)
    .set(updateData)
    .where(eq(habits.id, habitId))
    .returning();

  return updated;
}

export async function archiveHabit(userId: string, habitId: string) {
  return updateHabit(userId, habitId, { isArchived: true });
}

export async function reorderHabits(
  userId: string,
  orders: { id: string; sortOrder: number }[],
) {
  for (const item of orders) {
    await db
      .update(habits)
      .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
      .where(and(eq(habits.id, item.id), eq(habits.userId, userId)));
  }
}

export async function verifyHabitOwnership(userId: string, habitId: string) {
  const [row] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));

  if (!row) {
    throw new AppError("Habit not found", 404);
  }
}
