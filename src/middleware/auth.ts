import type { Context, Next } from "hono";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "./error-handler";

export type AppEnv = {
  Variables: {
    userId: string;
  };
};

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid Authorization header", 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    c.set("userId", payload.userId);
    await next();
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}
