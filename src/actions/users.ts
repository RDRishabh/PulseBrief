"use server";

import { revalidatePath } from "next/cache";
import { eq, ilike, or, sql, desc, and } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { userSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { formatPhone } from "@/lib/utils";

export async function getUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive" | "all";
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
        ilike(users.name, `%${params.search}%`),
        ilike(users.phone, `%${params.search}%`),
        ilike(users.email, `%${params.search}%`)
      )
    );
  }

  if (params.status && params.status !== "all") {
    conditions.push(eq(users.status, params.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
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

export async function createUser(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: (formData.get("email") as string) || undefined,
    city: formData.get("city") as string,
    zodiacSign: formData.get("zodiacSign") as string,
    status: formData.get("status") as "active" | "inactive",
  };

  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    await db.insert(users).values({
      ...parsed.data,
      phone: formatPhone(parsed.data.phone),
      email: parsed.data.email || null,
    });
    revalidatePath("/users");
    return { success: true };
  } catch {
    return { error: "Failed to create user. Phone may already exist." };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const raw = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: (formData.get("email") as string) || undefined,
    city: formData.get("city") as string,
    zodiacSign: formData.get("zodiacSign") as string,
    status: formData.get("status") as "active" | "inactive",
  };

  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    await db
      .update(users)
      .set({
        ...parsed.data,
        phone: formatPhone(parsed.data.phone),
        email: parsed.data.email || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    revalidatePath("/users");
    return { success: true };
  } catch {
    return { error: "Failed to update user" };
  }
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/users");
  return { success: true };
}

export async function bulkUploadUsers(usersList: any[]) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  if (!Array.isArray(usersList) || usersList.length === 0) {
    return { error: "No users data provided." };
  }

  const validatedUsers = [];
  const phoneSet = new Set<string>();

  for (let i = 0; i < usersList.length; i++) {
    const raw = usersList[i];
    
    // Basic defaults
    const status = (raw.status || "active").toLowerCase().trim();
    const zodiacSign = (raw.zodiacSign || "aries").toLowerCase().trim();
    
    const dataToValidate = {
      name: raw.name?.toString().trim() || "",
      phone: raw.phone?.toString().trim() || "",
      email: raw.email?.toString().trim() || undefined,
      city: raw.city?.toString().trim() || "Mumbai",
      zodiacSign: zodiacSign,
      status: status,
    };

    const parsed = userSchema.safeParse(dataToValidate);
    if (!parsed.success) {
      const errors = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return { error: `Row ${i + 1} validation failed: ${errors}` };
    }

    const formattedPhone = formatPhone(parsed.data.phone);
    if (phoneSet.has(formattedPhone)) {
      return {
        error: `Row ${i + 1} validation failed: Duplicate phone number '${formattedPhone}' found in the upload file.`,
      };
    }
    phoneSet.add(formattedPhone);

    validatedUsers.push({
      ...parsed.data,
      phone: formattedPhone,
      email: parsed.data.email || null,
    });
  }

  try {
    await db.insert(users).values(validatedUsers);
    revalidatePath("/users");
    return { success: true, count: validatedUsers.length };
  } catch (error: any) {
    console.error("Bulk upload users failed:", error);
    if (error.code === "23505" || error.message?.includes("unique")) {
      return {
        error: "Failed to insert users. One of the phone numbers already exists in the database.",
      };
    }
    return { error: error.message || "Failed to insert users." };
  }
}