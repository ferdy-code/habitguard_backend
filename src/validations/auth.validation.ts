import { z } from "@hono/zod-openapi";

export const UserSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    email: z.string().email().openapi({ example: "user@example.com" }),
    displayName: z.string().openapi({ example: "John Doe" }),
    avatarUrl: z.string().url().nullable().openapi({ example: "https://example.com/avatar.jpg" }),
    timezone: z.string().nullable().openapi({ example: "Asia/Jakarta" }),
    dailyScreenLimitMinutes: z.number().int().nullable().openapi({ example: 180 }),
    notificationEnabled: z.boolean().nullable().openapi({ example: true }),
    onboardingCompleted: z.boolean().nullable().openapi({ example: false }),
    isActive: z.boolean().nullable().openapi({ example: true }),
    createdAt: z.date().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.date().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("User");

export const AuthResponseSchema = z
  .object({
    user: UserSchema,
    accessToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
  })
  .openapi("AuthResponse");

export const TokenResponseSchema = z
  .object({
    accessToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
  })
  .openapi("TokenResponse");

export const ErrorSchema = z
  .object({
    success: z.boolean().openapi({ example: false }),
    message: z.string().openapi({ example: "Validation failed" }),
    errors: z.array(z.string()).optional().openapi({ example: ["Invalid email format"] }),
  })
  .openapi("Error");

export const SuccessSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    data: z.any().nullable().openapi({ example: null }),
  })
  .openapi("Success");

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email format").openapi({ example: "user@example.com" }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .openapi({ example: "Password123" }),
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(100, "Display name must be at most 100 characters")
      .openapi({ example: "John Doe" }),
  })
  .openapi("RegisterRequest");

export const loginSchema = z
  .object({
    email: z.string().email("Invalid email format").openapi({ example: "user@example.com" }),
    password: z.string().min(1, "Password is required").openapi({ example: "Password123" }),
  })
  .openapi("LoginRequest");

export const updateProfileSchema = z
  .object({
    displayName: z.string().min(2).max(100).optional().openapi({ example: "John Doe" }),
    avatarUrl: z.string().url().optional().nullable().openapi({ example: "https://example.com/avatar.jpg" }),
    timezone: z.string().max(50).optional().openapi({ example: "Asia/Jakarta" }),
    dailyScreenLimitMinutes: z.number().int().min(0).max(1440).optional().openapi({ example: 120 }),
    notificationEnabled: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("UpdateProfileRequest");

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required").openapi({ example: "OldPassword123" }),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .openapi({ example: "NewPassword123" }),
  })
  .openapi("ChangePasswordRequest");

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, "Refresh token is required").openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
  })
  .openapi("RefreshTokenRequest");
