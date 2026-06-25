import { and, eq, desc, sql } from "drizzle-orm";
import { db, quotes, userQuoteHistory } from "@/lib/db";
import type { QuoteData } from "./types";

export async function selectNextQuote(userId: string): Promise<QuoteData | null> {
  const activeQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.isActive, true));

  if (activeQuotes.length === 0) return null;

  const [latestCycle] = await db
    .select({ cycle: userQuoteHistory.cycleNumber })
    .from(userQuoteHistory)
    .where(eq(userQuoteHistory.userId, userId))
    .orderBy(desc(userQuoteHistory.cycleNumber))
    .limit(1);

  const currentCycle = latestCycle?.cycle ?? 1;

  const deliveredInCycle = await db
    .select({ quoteId: userQuoteHistory.quoteId })
    .from(userQuoteHistory)
    .where(
      and(
        eq(userQuoteHistory.userId, userId),
        eq(userQuoteHistory.cycleNumber, currentCycle)
      )
    );

  const deliveredIds = deliveredInCycle.map((d) => d.quoteId);
  let cycleToUse = currentCycle;

  let availableQuotes = activeQuotes.filter(
    (q) => !deliveredIds.includes(q.id)
  );

  if (availableQuotes.length === 0) {
    cycleToUse = currentCycle + 1;
    availableQuotes = activeQuotes;
  }

  const selected =
    availableQuotes[Math.floor(Math.random() * availableQuotes.length)];

  await db.insert(userQuoteHistory).values({
    userId,
    quoteId: selected.id,
    cycleNumber: cycleToUse,
  });

  return {
    id: selected.id,
    text: selected.text,
    author: selected.author,
    category: selected.category,
  };
}

export async function getQuoteStats(userId: string) {
  const [totalActive] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(eq(quotes.isActive, true));

  const [delivered] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userQuoteHistory)
    .where(eq(userQuoteHistory.userId, userId));

  const [cycle] = await db
    .select({ cycle: userQuoteHistory.cycleNumber })
    .from(userQuoteHistory)
    .where(eq(userQuoteHistory.userId, userId))
    .orderBy(desc(userQuoteHistory.cycleNumber))
    .limit(1);

  return {
    totalQuotes: totalActive?.count ?? 0,
    deliveredCount: delivered?.count ?? 0,
    currentCycle: cycle?.cycle ?? 1,
  };
}

