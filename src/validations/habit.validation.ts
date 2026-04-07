import { z } from "@hono/zod-openapi";

export const HabitSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    userId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    title: z.string().openapi({ example: "Morning Run" }),
    description: z.string().nullable().openapi({ example: "Run 5km every morning" }),
    icon: z.string().nullable().openapi({ example: "🏃" }),
    color: z.string().nullable().openapi({ example: "#4CAF50" }),
    frequency: z.enum(["daily", "weekly", "custom"]).openapi({ example: "daily" }),
    customDays: z.number().int().nullable().openapi({ example: 127 }),
    targetCount: z.number().int().nullable().openapi({ example: 1 }),
    reminderTime: z.string().nullable().openapi({ example: "07:00:00" }),
    reminderEnabled: z.boolean().nullable().openapi({ example: false }),
    category: z.string().nullable().openapi({ example: "Health" }),
    isArchived: z.boolean().nullable().openapi({ example: false }),
    sortOrder: z.number().int().nullable().openapi({ example: 0 }),
    createdAt: z.date().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.date().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("Habit");

export const HabitStreakSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    habitId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    userId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    currentStreak: z.number().int().nullable().openapi({ example: 5 }),
    longestStreak: z.number().int().nullable().openapi({ example: 12 }),
    lastCompletedDate: z.string().nullable().openapi({ example: "2024-01-15" }),
    updatedAt: z.date().nullable().openapi({ example: "2024-01-15T00:00:00.000Z" }),
  })
  .openapi("HabitStreak");

export const HabitCompletionSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    habitId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    userId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    completedDate: z.string().openapi({ example: "2024-01-15" }),
    count: z.number().int().nullable().openapi({ example: 1 }),
    notes: z.string().nullable().openapi({ example: "Felt great!" }),
    createdAt: z.date().nullable().openapi({ example: "2024-01-15T08:30:00.000Z" }),
  })
  .openapi("HabitCompletion");

export const HabitWithStreakSchema = HabitSchema.extend({
  streak: HabitStreakSchema.nullable(),
}).openapi("HabitWithStreak");

export const HabitStatsSchema = z
  .object({
    completionRate7d: z.number().openapi({ example: 0.85 }),
    completionRate30d: z.number().openapi({ example: 0.72 }),
    totalCompletions: z.number().int().openapi({ example: 45 }),
  })
  .openapi("HabitStats");

export const HabitDetailSchema = HabitSchema.extend({
  streak: HabitStreakSchema.nullable(),
  stats: HabitStatsSchema,
}).openapi("HabitDetail");

export const createHabitSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters").openapi({ example: "Morning Run" }),
    description: z.string().optional().openapi({ example: "Run 5km every morning" }),
    icon: z.string().max(50).optional().openapi({ example: "🏃" }),
    color: z.string().max(7).optional().openapi({ example: "#4CAF50" }),
    frequency: z.enum(["daily", "weekly", "custom"], { message: "Frequency is required" }).openapi({ example: "daily" }),
    customDays: z.number().int().min(1).max(127).optional().openapi({ example: 62, description: "Bitmask: Mon=1,Tue=2,Wed=4,Thu=8,Fri=16,Sat=32,Sun=64" }),
    targetCount: z.number().int().min(1).default(1).openapi({ example: 1 }),
    reminderTime: z.string().optional().openapi({ example: "07:00" }),
    reminderEnabled: z.boolean().optional().openapi({ example: false }),
    category: z.string().max(50).optional().openapi({ example: "Health" }),
  })
  .refine(
    (data) => data.frequency !== "custom" || data.customDays !== undefined,
    { message: "customDays is required when frequency is 'custom'", path: ["customDays"] }
  )
  .openapi("CreateHabitRequest");

export const updateHabitSchema = z
  .object({
    title: z.string().min(1).max(200).optional().openapi({ example: "Morning Run" }),
    description: z.string().optional().nullable().openapi({ example: "Run 5km every morning" }),
    icon: z.string().max(50).optional().nullable().openapi({ example: "🏃" }),
    color: z.string().max(7).optional().nullable().openapi({ example: "#4CAF50" }),
    frequency: z.enum(["daily", "weekly", "custom"]).optional().openapi({ example: "daily" }),
    customDays: z.number().int().min(1).max(127).optional().nullable().openapi({ example: 62 }),
    targetCount: z.number().int().min(1).optional().openapi({ example: 1 }),
    reminderTime: z.string().optional().nullable().openapi({ example: "07:00" }),
    reminderEnabled: z.boolean().optional().openapi({ example: false }),
    category: z.string().max(50).optional().nullable().openapi({ example: "Health" }),
  })
  .openapi("UpdateHabitRequest");

export const completeHabitSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional().openapi({ example: "2024-01-15" }),
    count: z.number().int().min(1).default(1).optional().openapi({ example: 1 }),
    notes: z.string().optional().openapi({ example: "Felt great!" }),
  })
  .openapi("CompleteHabitRequest");

export const reorderHabitsSchema = z
  .object({
    orders: z.array(
      z.object({
        id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
        sortOrder: z.number().int().min(0).openapi({ example: 0 }),
      })
    ).min(1),
  })
  .openapi("ReorderHabitsRequest");

export const dateRangeQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({ example: "2024-01-01" }),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({ example: "2024-01-31" }),
  })
  .openapi("DateRangeQuery");

export const listHabitsQuerySchema = z
  .object({
    archived: z.enum(["true", "false"]).optional().openapi({ example: "false" }),
  })
  .openapi("ListHabitsQuery");

export const undoCompletionParamsSchema = z
  .object({
    habitId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: "2024-01-15" }),
  })
  .openapi("UndoCompletionParams");
