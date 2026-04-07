import { z } from "@hono/zod-openapi";

export const DailySummarySchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    userId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    summaryDate: z.string().openapi({ example: "2024-01-15" }),
    totalScreenMinutes: z.number().int().nullable().openapi({ example: 120 }),
    habitsCompleted: z.number().int().nullable().openapi({ example: 5 }),
    habitsTotal: z.number().int().nullable().openapi({ example: 7 }),
    completionRate: z.string().nullable().openapi({ example: "71.43" }),
    focusMinutes: z.number().int().nullable().openapi({ example: 45 }),
    aiInsight: z.string().nullable().openapi({ example: "Great progress today! You completed 5 out of 7 habits." }),
    aiGeneratedAt: z.string().nullable().openapi({ example: "2024-01-15T22:00:00.000Z" }),
    createdAt: z.string().nullable().openapi({ example: "2024-01-15T22:00:00.000Z" }),
  })
  .openapi("DailySummary");

export const todayQuerySchema = z
  .object({
    timezone: z.string().optional().openapi({ example: "Asia/Jakarta" }),
  })
  .openapi("TodaySummaryQuery");

export const summariesQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: "2024-01-01" }),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: "2024-01-31" }),
  })
  .openapi("SummariesQuery");
