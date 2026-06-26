"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { runDailyBriefing, sendDailyBriefingToUser } from "@/lib/services/briefing";

export async function triggerAllBriefings() {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    const result = await runDailyBriefing();
    revalidatePath("/dashboard");
    revalidatePath("/users");
    return { success: true, ...result };
  } catch (error: any) {
    return { error: error.message || "Failed to trigger briefings" };
  }
}

export async function triggerSelectedBriefings(userIds: string[]) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  if (!userIds || userIds.length === 0) {
    return { error: "No users selected" };
  }

  try {
    const results = [];
    for (const id of userIds) {
      const res = await sendDailyBriefingToUser(id);
      results.push(res);
    }
    revalidatePath("/dashboard");
    revalidatePath("/users");

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      total: results.length,
      successCount,
      failureCount,
      results,
    };
  } catch (error: any) {
    return { error: error.message || "Failed to trigger selected briefings" };
  }
}
