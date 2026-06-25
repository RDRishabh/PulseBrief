import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const SAMPLE_QUOTES = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "motivation" as const,
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "success" as const,
  },
  {
    text: "In the middle of every difficulty lies opportunity.",
    author: "Albert Einstein",
    category: "wisdom" as const,
  },
  {
    text: "Life is what happens when you're busy making other plans.",
    author: "John Lennon",
    category: "life" as const,
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
    category: "wisdom" as const,
  },
  {
    text: "Your most unhappy customers are your greatest source of learning.",
    author: "Bill Gates",
    category: "business" as const,
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    category: "motivation" as const,
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi",
    category: "life" as const,
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "business" as const,
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    category: "wisdom" as const,
  },
];

const SAMPLE_USERS = [
  {
    name: "Rahul Sharma",
    phone: "919876543210",
    email: "rahul@example.com",
    city: "Mumbai",
    zodiacSign: "leo" as const,
  },
  {
    name: "Priya Patel",
    phone: "919876543211",
    email: "priya@example.com",
    city: "Delhi",
    zodiacSign: "virgo" as const,
  },
  {
    name: "Amit Kumar",
    phone: "919876543212",
    city: "Bangalore",
    zodiacSign: "aries" as const,
  },
];

async function seed() {
  console.log("Seeding database...");

  const [existingAdmin] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.email, "admin@pulsebrief.com"))
    .limit(1);

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.insert(schema.admins).values({
      email: "admin@pulsebrief.com",
      name: "Admin",
      passwordHash,
    });
    console.log("Created admin: admin@pulsebrief.com / admin123");
  } else {
    console.log("Admin already exists, skipping");
  }

  const existingQuotes = await db.select().from(schema.quotes);
  if (existingQuotes.length === 0) {
    await db.insert(schema.quotes).values(SAMPLE_QUOTES);
  }
  console.log(`Seeded up to ${SAMPLE_QUOTES.length} quotes`);

  for (const user of SAMPLE_USERS) {
    try {
      await db.insert(schema.users).values({
        ...user,
        status: "active",
      });
    } catch {
      console.log(`User ${user.phone} may already exist, skipping`);
    }
  }
  console.log(`Seeded sample users`);

  const [existingSettings] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "app_settings"))
    .limit(1);

  if (!existingSettings) {
    await db.insert(schema.settings).values({
      key: "app_settings",
      value: {
        briefingEnabled: true,
        defaultCity: "Mumbai",
        cronTime: "07:00",
        whatsappEnabled: true,
      },
    });
    console.log("Created default settings");
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});