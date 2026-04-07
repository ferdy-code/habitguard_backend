import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { apiRateLimit } from "../middleware/rate-limit";
import * as screenTimeService from "../services/screen-time.service";
import {
  ScreenTimeLimitSchema,
  SyncResultSchema,
  AppUsageSchema,
  AppUsageRangeSchema,
  DailyTotalSchema,
  CategoryUsageSchema,
  CorrelationSchema,
  syncLogsSchema,
  createLimitSchema,
  updateLimitSchema,
  dateRangeQuerySchema,
} from "../validations/screen-time.validation";
import { ErrorSchema } from "../validations/auth.validation";

const screenTimeApp = new OpenAPIHono<{
  Variables: { userId: string };
}>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const errors = result.error.issues.map((i) => i.message);
      return c.json({ success: false, message: "Validation failed", errors }, 400);
    }
  },
});

const SuccessSync = z.object({ success: z.literal(true), data: SyncResultSchema }).openapi("SuccessSync");
const SuccessAppUsageList = z.object({ success: z.literal(true), data: z.array(AppUsageSchema) }).openapi("SuccessAppUsageList");
const SuccessAppUsageRangeList = z.object({ success: z.literal(true), data: z.array(AppUsageRangeSchema) }).openapi("SuccessAppUsageRangeList");
const SuccessDailyTotals = z.object({ success: z.literal(true), data: z.array(DailyTotalSchema) }).openapi("SuccessDailyTotals");
const SuccessCategoryList = z.object({ success: z.literal(true), data: z.array(CategoryUsageSchema) }).openapi("SuccessCategoryList");
const SuccessCorrelation = z.object({ success: z.literal(true), data: CorrelationSchema }).openapi("SuccessCorrelation");
const SuccessLimit = z.object({ success: z.literal(true), data: ScreenTimeLimitSchema }).openapi("SuccessLimit");
const SuccessLimitList = z.object({ success: z.literal(true), data: z.array(ScreenTimeLimitSchema) }).openapi("SuccessLimitList");
const SuccessNull = z.object({ success: z.literal(true), data: z.null() }).openapi("SuccessNull");

const authSec = [{ bearerAuth: [] }];

const syncLogsRoute = createRoute({
  method: "post",
  path: "/sync",
  tags: ["Screen Time"],
  summary: "Sync screen time logs from device",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    body: { content: { "application/json": { schema: syncLogsSchema } }, required: true },
  },
  responses: {
    200: { content: { "application/json": { schema: SuccessSync } }, description: "Logs synced" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation failed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getTodayUsageRoute = createRoute({
  method: "get",
  path: "/today",
  tags: ["Screen Time"],
  summary: "Get today's screen time grouped by app",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  responses: {
    200: { content: { "application/json": { schema: SuccessAppUsageList } }, description: "Today usage" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getDailyTotalsRoute = createRoute({
  method: "get",
  path: "/daily",
  tags: ["Screen Time"],
  summary: "Get daily total screen time for date range",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: { query: dateRangeQuerySchema },
  responses: {
    200: { content: { "application/json": { schema: SuccessDailyTotals } }, description: "Daily totals" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation failed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getByAppRoute = createRoute({
  method: "get",
  path: "/by-app",
  tags: ["Screen Time"],
  summary: "Get screen time grouped by app for date range",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: { query: dateRangeQuerySchema },
  responses: {
    200: { content: { "application/json": { schema: SuccessAppUsageRangeList } }, description: "Per-app usage" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation failed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getByCategoryRoute = createRoute({
  method: "get",
  path: "/by-category",
  tags: ["Screen Time"],
  summary: "Get screen time grouped by category for date range",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: { query: dateRangeQuerySchema },
  responses: {
    200: { content: { "application/json": { schema: SuccessCategoryList } }, description: "Per-category usage" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation failed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getCorrelationRoute = createRoute({
  method: "get",
  path: "/correlation",
  tags: ["Screen Time"],
  summary: "Get screen time vs habit completion correlation",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  responses: {
    200: { content: { "application/json": { schema: SuccessCorrelation } }, description: "Correlation data" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const createLimitRoute = createRoute({
  method: "post",
  path: "/limits",
  tags: ["Screen Time"],
  summary: "Create a screen time limit",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    body: { content: { "application/json": { schema: createLimitSchema } }, required: true },
  },
  responses: {
    201: { content: { "application/json": { schema: SuccessLimit } }, description: "Limit created" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation failed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getLimitsRoute = createRoute({
  method: "get",
  path: "/limits",
  tags: ["Screen Time"],
  summary: "List all screen time limits",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  responses: {
    200: { content: { "application/json": { schema: SuccessLimitList } }, description: "Limits list" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const updateLimitRoute = createRoute({
  method: "patch",
  path: "/limits/{limitId}",
  tags: ["Screen Time"],
  summary: "Update a screen time limit",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({ limitId: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateLimitSchema } }, required: true },
  },
  responses: {
    200: { content: { "application/json": { schema: SuccessLimit } }, description: "Limit updated" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation failed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Limit not found" },
  },
});

const deleteLimitRoute = createRoute({
  method: "delete",
  path: "/limits/{limitId}",
  tags: ["Screen Time"],
  summary: "Delete a screen time limit",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({ limitId: z.string().uuid() }),
  },
  responses: {
    200: { content: { "application/json": { schema: SuccessNull } }, description: "Limit deleted" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Limit not found" },
  },
});

screenTimeApp.openapi(syncLogsRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { logs } = c.req.valid("json");
  const result = await screenTimeService.syncLogs(userId, logs as any);
  return c.json({ success: true, data: result } as const, 200);
});

screenTimeApp.openapi(getTodayUsageRoute, async (c) => {
  const userId = c.get("userId") as string;
  const data = await screenTimeService.getTodayUsage(userId);
  return c.json({ success: true, data } as const, 200);
});

screenTimeApp.openapi(getDailyTotalsRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { from, to } = c.req.valid("query");
  const data = await screenTimeService.getDailyTotals(userId, from, to);
  return c.json({ success: true, data } as const, 200);
});

screenTimeApp.openapi(getByAppRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { from, to } = c.req.valid("query");
  const data = await screenTimeService.getByApp(userId, from, to);
  return c.json({ success: true, data } as const, 200);
});

screenTimeApp.openapi(getByCategoryRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { from, to } = c.req.valid("query");
  const data = await screenTimeService.getByCategory(userId, from, to);
  return c.json({ success: true, data } as const, 200);
});

screenTimeApp.openapi(getCorrelationRoute, async (c) => {
  const userId = c.get("userId") as string;
  const data = await screenTimeService.getCorrelation(userId);
  return c.json({ success: true, data } as const, 200);
});

screenTimeApp.openapi(createLimitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const limit = await screenTimeService.createLimit(userId, body as any);
  return c.json({ success: true, data: limit } as const, 201);
});

screenTimeApp.openapi(getLimitsRoute, async (c) => {
  const userId = c.get("userId") as string;
  const data = await screenTimeService.getLimits(userId);
  return c.json({ success: true, data } as const, 200);
});

screenTimeApp.openapi(updateLimitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { limitId } = c.req.valid("param");
  const body = c.req.valid("json");
  const limit = await screenTimeService.updateLimit(userId, limitId, body as any);
  return c.json({ success: true, data: limit! } as const, 200);
});

screenTimeApp.openapi(deleteLimitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { limitId } = c.req.valid("param");
  await screenTimeService.deleteLimit(userId, limitId);
  return c.json({ success: true, data: null } as const, 200);
});

export default screenTimeApp;
