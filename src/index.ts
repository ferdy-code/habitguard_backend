import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Scalar } from "@scalar/hono-api-reference";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth.routes";
import habitsRoutes from "./routes/habits.routes";
import screenTimeRoutes from "./routes/screen-time.routes";
import { startStreakCronJob } from "./jobs/streak-calculator";

const app = new OpenAPIHono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  }),
);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/habits", habitsRoutes);
app.route("/api/v1/screen-time", screenTimeRoutes);

app.doc("/api/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "HabitGuard API",
    description: "Smart Habit Tracker + Screen Time Manager API",
  },
  servers: [{ url: "http://localhost:8000", description: "Development" }],
});

app.get(
  "/api/reference",
  Scalar({
    theme: "default",
    pageTitle: "HabitGuard API Docs",
    sources: [
      {
        url: "/api/doc",
      },
    ],
  }),
);

app.onError(errorHandler);

app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: "Not Found",
    },
    404,
  );
});

console.log(`🚀 HabitGuard API starting on port ${env.PORT}`);
console.log(`📖 API Docs: http://localhost:${env.PORT}/api/reference`);

startStreakCronJob();

export default {
  hostname: "0.0.0.0",
  port: env.PORT,
  fetch: app.fetch,
};
