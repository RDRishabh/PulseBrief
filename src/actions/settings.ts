"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, settings } from "@/lib/db";
import { settingsSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export interface AppSettings {
  briefingEnabled: boolean;
  defaultCity: string;
  cronTime: string;
  whatsappEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  briefingEnabled: true,
  defaultCity: "Mumbai",
  cronTime: "07:00",
  whatsappEnabled: true,
};

export async function getSettings(): Promise<AppSettings> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "app_settings"))
    .limit(1);

  if (!row) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as AppSettings) };
}

export async function updateSettings(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const raw = {
    briefingEnabled: formData.get("briefingEnabled") === "true",
    defaultCity: formData.get("defaultCity") as string,
    cronTime: formData.get("cronTime") as string,
    whatsappEnabled: formData.get("whatsappEnabled") === "true",
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "app_settings"))
    .limit(1);

  if (existing) {
    await db
      .update(settings)
      .set({ value: parsed.data, updatedAt: new Date() })
      .where(eq(settings.key, "app_settings"));
  } else {
    await db.insert(settings).values({
      key: "app_settings",
      value: parsed.data,
    });
  }

  revalidatePath("/settings");
  return { success: true };
}