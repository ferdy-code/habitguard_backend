import { z } from "@hono/zod-openapi";

export const FocusSessionSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    userId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    durationMinutes: z.number().int().openapi({ example: 25 }),
    completedMinutes: z.number().int().openapi({ example: 25 }),
    sessionType: z.string().nullable().openapi({ example: "pomodoro" }),
    status: z.string().nullable().openapi({ example: "completed" }),
    blockedApps: z.array(z.string()).nullable().openapi({ example: ["com.instagram.android", "com.tiktok"] }),
    startedAt: z.date().openapi({ example: "2024-01-15T08:00:00.000Z" }),
    endedAt: z.date().nullable().openapi({ example: "2024-01-15T08:25:00.000Z" }),
    createdAt: z.date().nullable().openapi({ example: "2024-01-15T08:25:00.000Z" }),
  })
  .openapi("FocusSession");

export const FocusStatsSchema = z
  .object({
    todayMinutes: z.number().int().openapi({ example: 50 }),
    weekMinutes: z.number().int().openapi({ example: 200 }),
    monthMinutes: z.number().int().openapi({ example: 800 }),
    todaySessions: z.number().int().openapi({ example: 2 }),
    weekSessions: z.number().int().openapi({ example: 8 }),
    monthSessions: z.number().int().openapi({ example: 30 }),
  })
  .openapi("FocusStats");

export const saveSessionSchema = z
  .object({
    durationMinutes: z.number().int().min(1).openapi({ example: 25 }),
    completedMinutes: z.number().int().min(0).openapi({ example: 25 }),
    sessionType: z.enum(["pomodoro", "deep_focus", "custom"]).default("pomodoro").openapi({ example: "pomodoro" }),
    status: z.enum(["completed", "cancelled", "interrupted"]).default("completed").openapi({ example: "completed" }),
    blockedApps: z.array(z.string()).optional().openapi({ example: ["com.instagram.android"] }),
    startedAt: z.string().openapi({ example: "2024-01-15T08:00:00.000Z" }),
    endedAt: z.string().optional().openapi({ example: "2024-01-15T08:25:00.000Z" }),
  })
  .openapi("SaveSessionRequest");

export const sessionListQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({ example: "2024-01-01" }),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({ example: "2024-01-31" }),
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  })
  .openapi("SessionListQuery");

export const PaginatedSessionsSchema = z
  .object({
    sessions: z.array(FocusSessionSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  })
  .openapi("PaginatedSessions");
