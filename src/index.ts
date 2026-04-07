import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.onError(errorHandler);

app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: "Not Found",
    },
    404
  );
});

console.log(`🚀 HabitGuard API starting on port ${env.PORT}`);
export default {
  port: env.PORT,
  fetch: app.fetch,
};
