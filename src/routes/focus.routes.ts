import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { apiRateLimit } from "../middleware/rate-limit";
import * as focusService from "../services/focus.service";
import {
  FocusSessionSchema,
  FocusStatsSchema,
  PaginatedSessionsSchema,
  saveSessionSchema,
  sessionListQuerySchema,
} from "../validations/focus.validation";
import { ErrorSchema } from "../validations/auth.validation";

const focusApp = new OpenAPIHono<{
  Variables: { userId: string };
}>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const errors = result.error.issues.map((i) => i.message);
      return c.json({ success: false, message: "Validation failed", errors }, 400);
    }
  },
});

const SuccessSession = z.object({ success: z.literal(true), data: FocusSessionSchema }).openapi("SuccessSession");
const SuccessPaginated = z.object({ success: z.literal(true), data: PaginatedSessionsSchema }).openapi("SuccessPaginated");
const SuccessStats = z.object({ success: z.literal(true), data: FocusStatsSchema }).openapi("SuccessStats");

const authSec = [{ bearerAuth: [] }];

const saveSessionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Focus Sessions"],
  summary: "Save a focus session",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    body: { content: { "application/json": { schema: saveSessionSchema } }, required: true },
  },
  responses: {
    201: { content: { "application/json": { schema: SuccessSession } }, description: "Session saved" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Validation failed" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getSessionsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Focus Sessions"],
  summary: "Get focus session history with pagination",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: { query: sessionListQuerySchema },
  responses: {
    200: { content: { "application/json": { schema: SuccessPaginated } }, description: "Sessions list" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

const getStatsRoute = createRoute({
  method: "get",
  path: "/stats",
  tags: ["Focus Sessions"],
  summary: "Get focus session statistics",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  responses: {
    200: { content: { "application/json": { schema: SuccessStats } }, description: "Focus stats" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
  },
});

focusApp.openapi(saveSessionRoute, async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const session = await focusService.saveSession(userId, body as any);
  return c.json({ success: true, data: session } as const, 201);
});

focusApp.openapi(getSessionsRoute, async (c) => {
  const userId = c.get("userId") as string;
  const query = c.req.valid("query");
  const result = await focusService.getSessions(userId, query as any);
  return c.json({ success: true, data: result } as const, 200);
});

focusApp.openapi(getStatsRoute, async (c) => {
  const userId = c.get("userId") as string;
  const stats = await focusService.getStats(userId);
  return c.json({ success: true, data: stats } as const, 200);
});

export default focusApp;
