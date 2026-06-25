"use server";

import { eq, sql, desc, gte } from "drizzle-orm";
import { db, users, quotes, deliveryLogs } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getDashboardStats() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    totalUsers,
    activeUsers,
    totalQuotes,
    sentLogs,
    failedLogs,
    recentLogs,
    weeklySent,
    prevWeeklySent,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.status, "active")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(quotes)
      .where(eq(quotes.isActive, true)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveryLogs)
      .where(eq(deliveryLogs.status, "sent")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveryLogs)
      .where(eq(deliveryLogs.status, "failed")),
    db
      .select({
        id: deliveryLogs.id,
        status: deliveryLogs.status,
        sentAt: deliveryLogs.sentAt,
        createdAt: deliveryLogs.createdAt,
        userName: users.name,
        userId: users.id,
      })
      .from(deliveryLogs)
      .innerJoin(users, eq(deliveryLogs.userId, users.id))
      .orderBy(desc(deliveryLogs.createdAt))
      .limit(5),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveryLogs)
      .where(
        sql`${deliveryLogs.status} = 'sent' AND ${deliveryLogs.sentAt} >= ${weekAgo.toISOString()}`
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveryLogs)
      .where(
        sql`${deliveryLogs.status} = 'sent' AND ${deliveryLogs.sentAt} >= ${new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()} AND ${deliveryLogs.sentAt} < ${weekAgo.toISOString()}`
      ),
  ]);

  const currentWeek = weeklySent[0]?.count ?? 0;
  const prevWeek = prevWeeklySent[0]?.count ?? 0;
  const deliveryChange =
    prevWeek > 0
      ? Math.round(((currentWeek - prevWeek) / prevWeek) * 100)
      : currentWeek > 0
        ? 100
        : 0;

  return {
    totalUsers: totalUsers[0]?.count ?? 0,
    activeUsers: activeUsers[0]?.count ?? 0,
    totalQuotes: totalQuotes[0]?.count ?? 0,
    sentDeliveries: sentLogs[0]?.count ?? 0,
    failedDeliveries: failedLogs[0]?.count ?? 0,
    deliveryChange,
    recentLogs,
  };
}