import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { users, refreshTokens } from "../db/schema";
import { hashPassword, verifyPassword } from "../utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from "../utils/jwt";
import { AppError } from "../middleware/error-handler";

function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function buildTokenPayload(user: typeof users.$inferSelect): TokenPayload {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export async function register(
  email: string,
  password: string,
  displayName: string,
) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing.length > 0) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({ email, passwordHash, displayName })
    .returning();

  const payload = buildTokenPayload(newUser!);
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  const tokenHash = await Bun.password.hash(refreshToken, "bcrypt");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId: newUser!.id,
    tokenHash,
    expiresAt,
  });

  return {
    user: sanitizeUser(newUser!),
    accessToken,
    refreshToken,
  };
}

export async function login(email: string, password: string) {
  const result = await db.select().from(users).where(eq(users.email, email));

  const user = result[0];
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated", 403);
  }

  const payload = buildTokenPayload(user);
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  const tokenHash = await Bun.password.hash(refreshToken, "bcrypt");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(token: string) {
  let payload: Awaited<ReturnType<typeof verifyRefreshToken>>;
  try {
    payload = await verifyRefreshToken(token);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const storedTokens = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, payload.userId));

  let found = false;
  for (const stored of storedTokens) {
    const match = await Bun.password.verify(token, stored.tokenHash);
    if (match) {
      found = true;
      break;
    }
  }

  if (!found) {
    throw new AppError("Refresh token not found or revoked", 401);
  }

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId));

  const user = userResult[0];
  if (!user || !user.isActive) {
    throw new AppError("User not found or deactivated", 401);
  }

  const newPayload = buildTokenPayload(user);
  const accessToken = await signAccessToken(newPayload);
  const newRefreshToken = await signRefreshToken(newPayload);

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));

  const tokenHash = await Bun.password.hash(newRefreshToken, "bcrypt");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken: accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(userId: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function getProfile(userId: string) {
  const result = await db.select().from(users).where(eq(users.id, userId));

  const user = result[0];
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return sanitizeUser(user);
}

export async function updateProfile(
  userId: string,
  data: {
    displayName?: string;
    avatarUrl?: string | null;
    timezone?: string;
    dailyScreenLimitMinutes?: number;
    notificationEnabled?: boolean;
  },
) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.dailyScreenLimitMinutes !== undefined)
    updateData.dailyScreenLimitMinutes = data.dailyScreenLimitMinutes;
  if (data.notificationEnabled !== undefined)
    updateData.notificationEnabled = data.notificationEnabled;

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return sanitizeUser(updated);
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
) {
  const result = await db.select().from(users).where(eq(users.id, userId));

  const user = result[0];
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const valid = await verifyPassword(oldPassword, user.passwordHash);
  if (!valid) {
    throw new AppError("Current password is incorrect", 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function completeOnboarding(userId: string) {
  const [updated] = await db
    .update(users)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new AppError("User not found", 404);
  }

  return sanitizeUser(updated);
}
