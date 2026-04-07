import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  const passwordHash = await Bun.password.hash("Test123!", "bcrypt");

  const [user] = await db
    .insert(schema.users)
    .values({
      email: "admin@habitguard.com",
      passwordHash,
      displayName: "Keina",
      timezone: "Asia/Jakarta",
      onboardingCompleted: true,
    })
    .returning();

  console.log(`✅ Created user: ${user.displayName} (${user.email})`);

  const habitData = [
    {
      userId: user.id,
      title: "Olahraga",
      description: "Olahraga minimal 30 menit",
      icon: "\uD83C\uDFCB\uFE0F",
      color: "#4CAF50",
      frequency: "daily" as const,
      category: "Kebugaran",
    },
    {
      userId: user.id,
      title: "Baca Buku",
      description: "Baca buku minimal 20 halaman",
      icon: "\uD83D\uDCD6",
      color: "#2196F3",
      frequency: "daily" as const,
      category: "Pembelajaran",
    },
    {
      userId: user.id,
      title: "Meditasi",
      description: "Meditasi 10 menit",
      icon: "\uD83E\uDDD8",
      color: "#9C27B0",
      frequency: "daily" as const,
      category: "Mindfulness",
    },
    {
      userId: user.id,
      title: "Minum Air 8 Gelas",
      description: "Minum 8 gelas air per hari",
      icon: "\uD83D\uDCA7",
      color: "#00BCD4",
      frequency: "daily" as const,
      category: "Kesehatan",
    },
    {
      userId: user.id,
      title: "Tidur Sebelum 11",
      description: "Tidur sebelum jam 11 malam",
      icon: "\uD83D\uDE34",
      color: "#3F51B5",
      frequency: "daily" as const,
      category: "Kesehatan",
    },
  ];

  const habits = await db.insert(schema.habits).values(habitData).returning();
  console.log(`✅ Created ${habits.length} habits`);

  await db.insert(schema.habitStreaks).values(
    habits.map((habit) => ({
      habitId: habit.id,
      userId: user.id,
      currentStreak: 0,
      longestStreak: 0,
    }))
  );
  console.log("✅ Created habit streaks");

  const today = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const completionPattern = [
    [0, 1, 2, 3, 4],
    [0, 1, 3, 4],
    [0, 2, 3, 4],
    [0, 1, 2, 3],
    [1, 2, 4],
    [0, 1, 2, 3, 4],
    [0, 2, 3],
  ];

  const completions: {
    habitId: string;
    userId: string;
    completedDate: string;
    count: number;
  }[] = [];

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const completedHabits = completionPattern[dayIdx];
    for (const habitIdx of completedHabits) {
      completions.push({
        habitId: habits[habitIdx].id,
        userId: user.id,
        completedDate: dates[dayIdx],
        count: 1,
      });
    }
  }

  await db.insert(schema.habitCompletions).values(completions);
  console.log(`✅ Created ${completions.length} habit completions (7 hari)`);

  const apps = [
    {
      packageName: "com.instagram.android",
      name: "Instagram",
      category: "social_media",
    },
    {
      packageName: "com.twitter.android",
      name: "X (Twitter)",
      category: "social_media",
    },
    {
      packageName: "com.google.android.youtube",
      name: "YouTube",
      category: "entertainment",
    },
    {
      packageName: "com.zhiliaoapp.musically",
      name: "TikTok",
      category: "entertainment",
    },
    {
      packageName: "com.whatsapp",
      name: "WhatsApp",
      category: "communication",
    },
  ];

  const screenTimeData: {
    userId: string;
    appPackageName: string;
    appName: string;
    appCategory: string;
    usageDate: string;
    usageMinutes: number;
    openCount: number;
  }[] = [];

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const numApps = 3 + Math.floor(Math.random() * 3);
    const shuffled = [...apps].sort(() => Math.random() - 0.5);
    const dayApps = shuffled.slice(0, numApps);

    for (const app of dayApps) {
      screenTimeData.push({
        userId: user.id,
        appPackageName: app.packageName,
        appName: app.name,
        appCategory: app.category,
        usageDate: dates[dayIdx],
        usageMinutes: 15 + Math.floor(Math.random() * 90),
        openCount: 3 + Math.floor(Math.random() * 15),
      });
    }
  }

  await db.insert(schema.screenTimeLogs).values(screenTimeData);
  console.log(
    `✅ Created ${screenTimeData.length} screen time logs (7 hari)`
  );

  await queryClient.end();
  console.log("\n🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
