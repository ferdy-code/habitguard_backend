import { sign, verify } from "hono/jwt";
import { env } from "../config/env";

interface JwtPayload {
  userId: string;
  email: string;
  displayName: string;
  exp: number;
  iat: number;
}

export type TokenPayload = Omit<JwtPayload, "exp" | "iat">;

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    },
    env.JWT_SECRET,
    "HS256",
  );
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
    env.JWT_REFRESH_SECRET,
    "HS256",
  );
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  return verify(
    token,
    env.JWT_SECRET,
    "HS256",
  ) as unknown as Promise<JwtPayload>;
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  return verify(
    token,
    env.JWT_REFRESH_SECRET,
    "HS256",
  ) as unknown as Promise<JwtPayload>;
}
