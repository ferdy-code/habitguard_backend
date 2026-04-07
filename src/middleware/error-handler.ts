import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

interface AppError extends Error {
  status?: number;
  errors?: string[];
}

export function errorHandler(err: AppError, c: Context) {
  const status = (err.status || 500) as StatusCode;
  const message = err.message || "Internal Server Error";

  console.error(`[Error] ${status}: ${message}`);

  return c.json(
    {
      success: false,
      message,
      ...(err.errors && { errors: err.errors }),
    },
    status
  );
}

export class AppError extends Error {
  status: number;
  errors?: string[];

  constructor(message: string, status = 500, errors?: string[]) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.errors = errors;
  }
}
