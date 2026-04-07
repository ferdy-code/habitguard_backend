import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { apiRateLimit } from "../middleware/rate-limit";
import * as habitService from "../services/habit.service";
import * as streakService from "../services/streak.service";
import {
  HabitWithStreakSchema,
  HabitDetailSchema,
  HabitCompletionSchema,
  createHabitSchema,
  updateHabitSchema,
  completeHabitSchema,
  reorderHabitsSchema,
  listHabitsQuerySchema,
  dateRangeQuerySchema,
} from "../validations/habit.validation";
import { ErrorSchema } from "../validations/auth.validation";

const habitsApp = new OpenAPIHono<{
  Variables: { userId: string };
}>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const errors = result.error.issues.map((i) => i.message);
      return c.json(
        { success: false, message: "Validation failed", errors },
        400,
      );
    }
  },
});

const SuccessHabit = z
  .object({ success: z.literal(true), data: HabitWithStreakSchema })
  .openapi("SuccessHabit");
const SuccessHabitList = z
  .object({ success: z.literal(true), data: z.array(HabitWithStreakSchema) })
  .openapi("SuccessHabitList");
const SuccessHabitDetail = z
  .object({ success: z.literal(true), data: HabitDetailSchema })
  .openapi("SuccessHabitDetail");
const SuccessCompletion = z
  .object({ success: z.literal(true), data: HabitCompletionSchema })
  .openapi("SuccessCompletion");
const SuccessCompletionList = z
  .object({ success: z.literal(true), data: z.array(HabitCompletionSchema) })
  .openapi("SuccessCompletionList");
const SuccessNull = z
  .object({ success: z.literal(true), data: z.null() })
  .openapi("SuccessNull");

const authSec = [{ bearerAuth: [] }];

const createHabitRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Habits"],
  summary: "Create a new habit",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    body: {
      content: { "application/json": { schema: createHabitSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessHabit } },
      description: "Habit created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

const listHabitsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Habits"],
  summary: "List user habits with streak info",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    query: listHabitsQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessHabitList } },
      description: "Habits list",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

const getHabitRoute = createRoute({
  method: "get",
  path: "/{habitId}",
  tags: ["Habits"],
  summary: "Get habit detail with stats",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({ habitId: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessHabitDetail } },
      description: "Habit detail",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Habit not found",
    },
  },
});

const updateHabitRoute = createRoute({
  method: "patch",
  path: "/{habitId}",
  tags: ["Habits"],
  summary: "Update a habit",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({ habitId: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updateHabitSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessHabit } },
      description: "Habit updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Habit not found",
    },
  },
});

const archiveHabitRoute = createRoute({
  method: "patch",
  path: "/{habitId}/archive",
  tags: ["Habits"],
  summary: "Archive a habit",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({ habitId: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessHabit } },
      description: "Habit archived",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Habit not found",
    },
  },
});

const reorderHabitsRoute = createRoute({
  method: "patch",
  path: "/reorder",
  tags: ["Habits"],
  summary: "Reorder habits",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    body: {
      content: { "application/json": { schema: reorderHabitsSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessNull } },
      description: "Habits reordered",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

const completeHabitRoute = createRoute({
  method: "post",
  path: "/{habitId}/complete",
  tags: ["Habits"],
  summary: "Mark habit as completed for a date",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({ habitId: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: completeHabitSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessCompletion } },
      description: "Habit completed",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Habit not found",
    },
  },
});

const undoCompletionRoute = createRoute({
  method: "delete",
  path: "/{habitId}/complete/{date}",
  tags: ["Habits"],
  summary: "Undo a habit completion for a date",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({
      habitId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessNull } },
      description: "Completion undone",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Completion not found",
    },
  },
});

const getCompletionsRoute = createRoute({
  method: "get",
  path: "/{habitId}/completions",
  tags: ["Habits"],
  summary: "Get habit completions with optional date range",
  security: authSec,
  middleware: [authMiddleware, apiRateLimit()] as const,
  request: {
    params: z.object({ habitId: z.string().uuid() }),
    query: dateRangeQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessCompletionList } },
      description: "Completions list",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

habitsApp.openapi(createHabitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const data = c.req.valid("json");
  const habit = await habitService.createHabit(userId, data as any);
  return c.json({ success: true, data: habit } as const, 201);
});

habitsApp.openapi(listHabitsRoute, async (c) => {
  const userId = c.get("userId") as string;
  const query = c.req.valid("query");
  const archived =
    query.archived === "true"
      ? true
      : query.archived === "false"
        ? false
        : undefined;
  const list = await habitService.getHabits(userId, { archived });
  return c.json({ success: true, data: list } as const, 200);
});

habitsApp.openapi(getHabitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { habitId } = c.req.valid("param");
  const detail = await habitService.getHabitById(userId, habitId);
  return c.json({ success: true, data: detail } as const, 200);
});

habitsApp.openapi(reorderHabitsRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { orders } = c.req.valid("json");
  await habitService.reorderHabits(userId, orders);
  return c.json({ success: true, data: null } as const, 200);
});

habitsApp.openapi(updateHabitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { habitId } = c.req.valid("param");
  const data = c.req.valid("json");
  await habitService.updateHabit(userId, habitId, data as any);
  const detail = await habitService.getHabitById(userId, habitId);
  return c.json({ success: true, data: detail } as const, 200);
});

habitsApp.openapi(archiveHabitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { habitId } = c.req.valid("param");
  await habitService.archiveHabit(userId, habitId);
  const detail = await habitService.getHabitById(userId, habitId);
  return c.json({ success: true, data: detail } as const, 200);
});

habitsApp.openapi(completeHabitRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { habitId } = c.req.valid("param");
  const body = c.req.valid("json");
  const completion = await streakService.completeHabit(
    userId,
    habitId,
    body as any,
  );
  return c.json({ success: true, data: completion! } as const, 200);
});

habitsApp.openapi(undoCompletionRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { habitId, date } = c.req.valid("param");
  await streakService.undoCompletion(userId, habitId, date);
  return c.json({ success: true, data: null } as const, 200);
});

habitsApp.openapi(getCompletionsRoute, async (c) => {
  const { habitId } = c.req.valid("param");
  const query = c.req.valid("query");
  const completions = await streakService.getCompletions(habitId, query as any);
  return c.json({ success: true, data: completions } as const, 200);
});

export default habitsApp;
