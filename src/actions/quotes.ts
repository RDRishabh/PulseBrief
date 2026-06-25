"use server";

import { revalidatePath } from "next/cache";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import { db, quotes } from "@/lib/db";
import { quoteSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export async function getQuotes(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.search) {
    conditions.push(
      or(
        ilike(quotes.text, `%${params.search}%`),
        ilike(quotes.author, `%${params.search}%`)
      )
    );
  }

  if (params.category && params.category !== "all") {
    conditions.push(
      eq(
        quotes.category,
        params.category as "motivation" | "wisdom" | "success" | "life" | "business"
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(quotes)
      .where(where)
      .orderBy(desc(quotes.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(quotes)
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

export async function createQuote(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const raw = {
    text: formData.get("text") as string,
    author: formData.get("author") as string,
    category: formData.get("category") as string,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  await db.insert(quotes).values(parsed.data);
  revalidatePath("/quotes");
  return { success: true };
}

export async function updateQuote(id: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const raw = {
    text: formData.get("text") as string,
    author: formData.get("author") as string,
    category: formData.get("category") as string,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  await db
    .update(quotes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(quotes.id, id));
  revalidatePath("/quotes");
  return { success: true };
}

export async function deleteQuote(id: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  await db.delete(quotes).where(eq(quotes.id, id));
  revalidatePath("/quotes");
  return { success: true };
}

export async function bulkUploadQuotes(quotesList: any[]) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  if (!Array.isArray(quotesList) || quotesList.length === 0) {
    return { error: "No quotes data provided." };
  }

  const validatedQuotes = [];

  for (let i = 0; i < quotesList.length; i++) {
    const raw = quotesList[i];
    
    // Normalize category
    const category = (raw.category || "motivation").toLowerCase().trim();
    
    // Parse isActive boolean
    let isActive = true;
    if (raw.isActive !== undefined && raw.isActive !== null && raw.isActive !== "") {
      const activeStr = raw.isActive.toString().toLowerCase().trim();
      if (activeStr === "false" || activeStr === "no" || activeStr === "0" || activeStr === "inactive") {
        isActive = false;
      }
    }

    const dataToValidate = {
      text: raw.text?.toString().trim() || "",
      author: raw.author?.toString().trim() || "",
      category: category,
      isActive: isActive,
    };

    const parsed = quoteSchema.safeParse(dataToValidate);
    if (!parsed.success) {
      const errors = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return { error: `Row ${i + 1} validation failed: ${errors}` };
    }
    validatedQuotes.push(parsed.data);
  }

  try {
    await db.insert(quotes).values(validatedQuotes);
    revalidatePath("/quotes");
    return { success: true, count: validatedQuotes.length };
  } catch (error: any) {
    console.error("Bulk upload quotes failed:", error);
    return { error: error.message || "Failed to insert quotes." };
  }
}