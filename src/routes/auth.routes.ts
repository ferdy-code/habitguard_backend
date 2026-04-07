import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { authRateLimit, apiRateLimit } from "../middleware/rate-limit";
import * as authService from "../services/auth.service";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  UserSchema,
  AuthResponseSchema,
  TokenResponseSchema,
  ErrorSchema,
} from "../validations/auth.validation";

const authApp = new OpenAPIHono<{
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

const SuccessDataNull = z
  .object({ success: z.literal(true), data: z.null() })
  .openapi("SuccessNull");

const SuccessDataUser = z
  .object({ success: z.literal(true), data: UserSchema })
  .openapi("SuccessUser");

const SuccessDataAuth = z
  .object({ success: z.literal(true), data: AuthResponseSchema })
  .openapi("SuccessAuth");

const SuccessDataToken = z
  .object({ success: z.literal(true), data: TokenResponseSchema })
  .openapi("SuccessToken");

const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Auth"],
  summary: "Register a new user",
  middleware: [authRateLimit()] as const,
  request: {
    body: {
      content: { "application/json": { schema: registerSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessDataAuth } },
      description: "User registered successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Email already registered",
    },
  },
});

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  middleware: [authRateLimit()] as const,
  request: {
    body: {
      content: { "application/json": { schema: loginSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessDataAuth } },
      description: "Login successful",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid credentials",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Account deactivated",
    },
  },
});

const refreshTokenRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  summary: "Refresh access token",
  middleware: [authRateLimit()] as const,
  request: {
    body: {
      content: { "application/json": { schema: refreshTokenSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessDataToken } },
      description: "Token refreshed successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid or expired refresh token",
    },
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Logout current user",
  middleware: [authMiddleware, apiRateLimit()] as const,
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      authorization: z
        .string()
        .openapi({ example: "Bearer eyJhbGciOiJIUzI1NiIs..." }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessDataNull } },
      description: "Logout successful",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing or invalid token",
    },
  },
});

const getProfileRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Auth"],
  summary: "Get current user profile",
  middleware: [authMiddleware, apiRateLimit()] as const,
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      authorization: z
        .string()
        .openapi({ example: "Bearer eyJhbGciOiJIUzI1NiIs..." }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessDataUser } },
      description: "User profile retrieved",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing or invalid token",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "User not found",
    },
  },
});

const updateProfileRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Auth"],
  summary: "Update current user profile",
  middleware: [authMiddleware, apiRateLimit()] as const,
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      authorization: z
        .string()
        .openapi({ example: "Bearer eyJhbGciOiJIUzI1NiIs..." }),
    }),
    body: {
      content: { "application/json": { schema: updateProfileSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessDataUser } },
      description: "Profile updated successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing or invalid token",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "User not found",
    },
  },
});

const changePasswordRoute = createRoute({
  method: "patch",
  path: "/me/password",
  tags: ["Auth"],
  summary: "Change current user password",
  middleware: [authMiddleware, authRateLimit()] as const,
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      authorization: z
        .string()
        .openapi({ example: "Bearer eyJhbGciOiJIUzI1NiIs..." }),
    }),
    body: {
      content: { "application/json": { schema: changePasswordSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessDataNull } },
      description: "Password changed successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation failed or incorrect current password",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing or invalid token",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "User not found",
    },
  },
});

const completeOnboardingRoute = createRoute({
  method: "patch",
  path: "/me/onboarding",
  tags: ["Auth"],
  summary: "Complete user onboarding",
  middleware: [authMiddleware, apiRateLimit()] as const,
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      authorization: z
        .string()
        .openapi({ example: "Bearer eyJhbGciOiJIUzI1NiIs..." }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessDataUser } },
      description: "Onboarding completed successfully",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing or invalid token",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "User not found",
    },
  },
});

authApp.openapi(registerRoute, async (c) => {
  const { email, password, displayName } = c.req.valid("json");
  const result = await authService.register(email, password, displayName);
  return c.json({ success: true, data: result } as const, 201);
});

authApp.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const result = await authService.login(email, password);
  return c.json({ success: true, data: result } as const, 200);
});

authApp.openapi(refreshTokenRoute, async (c) => {
  const { refreshToken } = c.req.valid("json");
  const result = await authService.refreshAccessToken(refreshToken);
  return c.json({ success: true, data: result } as const, 200);
});

authApp.openapi(logoutRoute, async (c) => {
  const userId = c.get("userId") as string;
  await authService.logout(userId);
  return c.json({ success: true, data: null } as const, 200);
});

authApp.openapi(getProfileRoute, async (c) => {
  const userId = c.get("userId") as string;
  const user = await authService.getProfile(userId);
  return c.json({ success: true, data: user } as const, 200);
});

authApp.openapi(updateProfileRoute, async (c) => {
  const userId = c.get("userId") as string;
  const data = c.req.valid("json");
  const user = await authService.updateProfile(userId, data as any);
  return c.json({ success: true, data: user } as const, 200);
});

authApp.openapi(changePasswordRoute, async (c) => {
  const userId = c.get("userId") as string;
  const { oldPassword, newPassword } = c.req.valid("json");
  await authService.changePassword(userId, oldPassword, newPassword);
  return c.json({ success: true, data: null } as const, 200);
});

authApp.openapi(completeOnboardingRoute, async (c) => {
  const userId = c.get("userId") as string;
  const user = await authService.completeOnboarding(userId);
  return c.json({ success: true, data: user } as const, 200);
});

export default authApp;
