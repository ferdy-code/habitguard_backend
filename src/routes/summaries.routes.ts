import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { apiRateLimit } from "../middleware/rate-limit";
import * as summaryService from "../services/summary.service";
import {
  DailySummarySchema,
  todayQuerySchema,
  summariesQuerySchema,
} from "../validations/summary.validation";
import { ErrorSchema } from "../validations/auth.validation";

const summariesApp = new OpenAPIHono<{
  Variables: { userId: string };
}>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const errors = result.error.issues.map((i) => i.message);
      return c.json({ success: false, message: "Validation failed", errors }, 400);
    }
  },
});

const SuccessSummary = z
  .object({ success: z.literal(true), data: DailySummarySchema })
  .openapi("SuccessSummary");

const SuccessSummaryList = z
  .object({ success: z.literal(true), data: z.array(DailySummarySchema) })
  .openapi("SuccessSummaryList");

const authSec = [{ bearerAuth: [] }];

const getTodayRoute = createRoute({
  method: "get",
  path: "/today",
  tags: ["Daily Summaries"],
  summary: "Get or generate today's daily summary",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: { query: todayQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSummary } },
      description: "Today's summary",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

const getSummariesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Daily Summaries"],
  summary: "Get daily summaries for a date range",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: { query: summariesQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSummaryList } },
      description: "List of summaries",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

const regenerateRoute = createRoute({
  method: "post",
  path: "/regenerate",
  tags: ["Daily Summaries"],
  summary: "Regenerate today's daily summary",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({ example: "2024-01-15" }) }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSummary } },
      description: "Regenerated summary",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

summariesApp.openapi(getTodayRoute, async (c) => {
  const userId = c.get("userId") as string;
  const query = c.req.valid("query");
  const summary = await summaryService.getTodaySummary(userId, query.timezone);
  if (!summary) {
    return c.json({ success: false, message: "Summary not found" } as const, 404) as any;
  }
  return c.json({ success: true, data: summary } as const, 200);
});

summariesApp.openapi(getSummariesRoute, async (c) => {
  const userId = c.get("userId") as string;
  const query = c.req.valid("query");
  const summaries = await summaryService.getSummaries(userId, query.from, query.to);
  return c.json({ success: true, data: summaries } as const, 200);
});

summariesApp.openapi(regenerateRoute, async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const summary = await summaryService.generateDailySummary(userId, body.date);
  if (!summary) {
    return c.json({ success: false, message: "Summary not found" } as const, 404) as any;
  }
  return c.json({ success: true, data: summary } as const, 200);
});

export default summariesApp;
