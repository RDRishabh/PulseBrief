"use server";

import { eq, desc, sql, and, ilike } from "drizzle-orm";
import { db, deliveryLogs, users } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getDeliveryLogs(params: {
  page?: number;
  limit?: number;
  status?: "sent" | "failed" | "pending" | "all";
  search?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.status && params.status !== "all") {
    conditions.push(eq(deliveryLogs.status, params.status));
  }

  if (params.search) {
    conditions.push(ilike(users.name, `%${params.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: deliveryLogs.id,
        status: deliveryLogs.status,
        messageContent: deliveryLogs.messageContent,
        errorMessage: deliveryLogs.errorMessage,
        whatsappMessageId: deliveryLogs.whatsappMessageId,
        sentAt: deliveryLogs.sentAt,
        createdAt: deliveryLogs.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(deliveryLogs)
      .innerJoin(users, eq(deliveryLogs.userId, users.id))
      .where(where)
      .orderBy(desc(deliveryLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveryLogs)
      .innerJoin(users, eq(deliveryLogs.userId, users.id))
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserDeliveryLogs(userId: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    const logs = await db
      .select({
        id: deliveryLogs.id,
        status: deliveryLogs.status,
        messageContent: deliveryLogs.messageContent,
        errorMessage: deliveryLogs.errorMessage,
        whatsappMessageId: deliveryLogs.whatsappMessageId,
        sentAt: deliveryLogs.sentAt,
        createdAt: deliveryLogs.createdAt,
      })
      .from(deliveryLogs)
      .where(eq(deliveryLogs.userId, userId))
      .orderBy(desc(deliveryLogs.createdAt));

    return { success: true, logs };
  } catch (error: any) {
    console.error("Failed to fetch user delivery logs:", error);
    return { error: error.message || "Failed to fetch history." };
  }
}