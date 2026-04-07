import { z } from "@hono/zod-openapi";

export const ScreenTimeLogSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    userId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    appPackageName: z.string().openapi({ example: "com.instagram.android" }),
    appName: z.string().nullable().openapi({ example: "Instagram" }),
    appCategory: z.string().nullable().openapi({ example: "social_media" }),
    usageDate: z.string().openapi({ example: "2024-01-15" }),
    usageMinutes: z.number().int().openapi({ example: 45 }),
    openCount: z.number().int().nullable().openapi({ example: 12 }),
    createdAt: z.date().nullable().openapi({ example: "2024-01-15T08:30:00.000Z" }),
  })
  .openapi("ScreenTimeLog");

export const ScreenTimeLimitSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    userId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    appPackageName: z.string().nullable().openapi({ example: "com.instagram.android" }),
    category: z.string().nullable().openapi({ example: "social_media" }),
    limitMinutes: z.number().int().openapi({ example: 60 }),
    isActive: z.boolean().nullable().openapi({ example: true }),
    createdAt: z.date().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.date().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("ScreenTimeLimit");

export const syncLogItemSchema = z
  .object({
    appPackageName: z.string().min(1).max(255).openapi({ example: "com.instagram.android" }),
    appName: z.string().max(200).optional().openapi({ example: "Instagram" }),
    usageDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").openapi({ example: "2024-01-15" }),
    usageMinutes: z.number().int().min(0).openapi({ example: 45 }),
    openCount: z.number().int().min(0).optional().openapi({ example: 12 }),
  })
  .openapi("SyncLogItem");

export const syncLogsSchema = z
  .object({
    logs: z.array(syncLogItemSchema).min(1, "At least one log is required"),
  })
  .openapi("SyncLogsRequest");

export const createLimitSchema = z
  .object({
    appPackageName: z.string().max(255).optional().openapi({ example: "com.instagram.android" }),
    category: z.string().max(50).optional().openapi({ example: "social_media" }),
    limitMinutes: z.number().int().min(1).openapi({ example: 60 }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .refine(
    (data) => data.appPackageName !== undefined || data.category !== undefined,
    { message: "Either appPackageName or category is required", path: ["appPackageName"] }
  )
  .openapi("CreateLimitRequest");

export const updateLimitSchema = z
  .object({
    limitMinutes: z.number().int().min(1).optional().openapi({ example: 60 }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("UpdateLimitRequest");

export const dateRangeQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: "2024-01-01" }),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: "2024-01-31" }),
  })
  .openapi("DateRangeQuery");

export const AppUsageSchema = z
  .object({
    appPackageName: z.string(),
    appName: z.string().nullable(),
    appCategory: z.string().nullable(),
    usageMinutes: z.number().int(),
    openCount: z.number().int().nullable(),
  })
  .openapi("AppUsage");

export const AppUsageRangeSchema = z
  .object({
    appPackageName: z.string(),
    appName: z.string().nullable(),
    appCategory: z.string().nullable(),
    totalMinutes: z.number().int(),
    totalOpenCount: z.number().int(),
  })
  .openapi("AppUsageRange");

export const DailyTotalSchema = z
  .object({
    usageDate: z.string(),
    totalMinutes: z.number().int(),
  })
  .openapi("DailyTotal");

export const CategoryUsageSchema = z
  .object({
    appCategory: z.string().nullable(),
    totalMinutes: z.number().int(),
    appCount: z.number().int(),
  })
  .openapi("CategoryUsage");

export const CorrelationSchema = z
  .object({
    perfectDayAvgMinutes: z.number().nullable(),
    lowDayAvgMinutes: z.number().nullable(),
    differencePercent: z.number().nullable(),
  })
  .openapi("Correlation");

export const SyncResultSchema = z
  .object({
    synced: z.number().int(),
  })
  .openapi("SyncResult");
