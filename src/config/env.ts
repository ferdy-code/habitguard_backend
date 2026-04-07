import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(4000),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    console.error("❌ Environment validation failed:");
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
