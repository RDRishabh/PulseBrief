import { eq } from "drizzle-orm";
import { db, users, deliveryLogs, settings } from "@/lib/db";
import { fetchWeather } from "./weather";
import { fetchGoldPrice } from "./gold";
import { fetchSensex } from "./sensex";
import { fetchHoroscope } from "./horoscope";
import { selectNextQuote } from "./quote-engine";
import { buildBriefingMessage } from "./message-builder";
import { sendWhatsAppMessage } from "./whatsapp";

interface BriefingResult {
  userId: string;
  userName: string;
  success: boolean;
  error?: string;
  logId?: string;
}

export async function isBriefingEnabled(): Promise<boolean> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "app_settings"))
    .limit(1);

  if (!setting) return true;
  const value = setting.value as { briefingEnabled?: boolean };
  return value.briefingEnabled !== false;
}

export async function sendDailyBriefingToUser(
  userId: string
): Promise<BriefingResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { userId, userName: "Unknown", success: false, error: "User not found" };
  }

  if (user.status !== "active") {
    return {
      userId,
      userName: user.name,
      success: false,
      error: "User is inactive",
    };
  }

  const [log] = await db
    .insert(deliveryLogs)
    .values({
      userId: user.id,
      status: "pending",
    })
    .returning();

  try {
    const [weather, gold, sensex, horoscope, quote] = await Promise.all([
      fetchWeather(user.city),
      fetchGoldPrice(),
      fetchSensex(),
      fetchHoroscope(user.zodiacSign),
      selectNextQuote(user.id),
    ]);

    if (!quote) {
      throw new Error("No active quotes available");
    }

    const message = buildBriefingMessage({
      weather,
      gold,
      sensex,
      horoscope,
      quote,
    });

    const whatsappResult = await sendWhatsAppMessage(user.phone, message);

    if (!whatsappResult.success) {
      await db
        .update(deliveryLogs)
        .set({
          status: "failed",
          errorMessage: whatsappResult.error,
          messageContent: message,
          weatherData: weather,
          goldData: gold,
          sensexData: sensex,
          horoscopeData: horoscope,
          quoteId: quote.id,
          // Rich Meta error detail
          metaErrorCode: whatsappResult.metaErrorCode ?? null,
          metaErrorType: whatsappResult.metaErrorType ?? null,
          metaErrorSubcode: whatsappResult.metaErrorSubcode ?? null,
          apiHttpStatus: whatsappResult.apiHttpStatus ?? null,
          rawApiResponse: whatsappResult.rawApiResponse ?? null,
        })
        .where(eq(deliveryLogs.id, log.id));

      return {
        userId,
        userName: user.name,
        success: false,
        error: whatsappResult.error,
        logId: log.id,
      };
    }

    await db
      .update(deliveryLogs)
      .set({
        status: "sent",
        messageContent: message,
        weatherData: weather,
        goldData: gold,
        sensexData: sensex,
        horoscopeData: horoscope,
        quoteId: quote.id,
        whatsappMessageId: whatsappResult.messageId,
        sentAt: new Date(),
        apiHttpStatus: whatsappResult.apiHttpStatus ?? null,
        rawApiResponse: whatsappResult.rawApiResponse ?? null,
      })
      .where(eq(deliveryLogs.id, log.id));

    return {
      userId,
      userName: user.name,
      success: true,
      logId: log.id,
    };

  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db
      .update(deliveryLogs)
      .set({
        status: "failed",
        errorMessage,
      })
      .where(eq(deliveryLogs.id, log.id));

    return {
      userId,
      userName: user.name,
      success: false,
      error: errorMessage,
      logId: log.id,
    };
  }
}

export async function runDailyBriefing(): Promise<{
  total: number;
  sent: number;
  failed: number;
  results: BriefingResult[];
}> {
  const enabled = await isBriefingEnabled();
  if (!enabled) {
    return { total: 0, sent: 0, failed: 0, results: [] };
  }

  const activeUsers = await db
    .select()
    .from(users)
    .where(eq(users.status, "active"));

  const results: BriefingResult[] = [];

  for (const user of activeUsers) {
    const result = await sendDailyBriefingToUser(user.id);
    results.push(result);
  }

  return {
    total: results.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}