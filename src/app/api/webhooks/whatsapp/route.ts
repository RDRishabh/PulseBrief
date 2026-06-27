import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db, deliveryLogs } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET - Meta Webhook Verification Handler (Hub Verification)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verification successful.");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.error("[WhatsApp Webhook] Verification failed. Mode or token mismatch.");
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST - WhatsApp Status Event Handler
 */
export async function POST(request: NextRequest) {
  const signatureHeader = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  const rawBody = await request.text();

  // Validate Meta webhook signature if App Secret is configured
  if (appSecret && signatureHeader) {
    try {
      const hmac = createHmac("sha256", appSecret);
      const digest = "sha256=" + hmac.update(rawBody).digest("hex");

      if (signatureHeader !== digest) {
        console.error("[WhatsApp Webhook] Signature validation failed.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch (err) {
      console.error("[WhatsApp Webhook] Signature computation error:", err);
      return NextResponse.json({ error: "Signature verification failed" }, { status: 500 });
    }
  }

  try {
    const payload = JSON.parse(rawBody);
    console.log("[WhatsApp Webhook Received Payload]:", JSON.stringify(payload, null, 2));

    const entries = payload.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        const value = change.value ?? {};
        const statuses = value.statuses ?? [];

        for (const statusObj of statuses) {
          const messageId = statusObj.id as string | undefined;
          const status = statusObj.status as string | undefined; // "sent" | "delivered" | "read" | "failed"
          const timestamp = statusObj.timestamp
            ? new Date(Number(statusObj.timestamp) * 1000)
            : new Date();

          if (!messageId || !status) continue;

          // Extract full error detail from webhook failure payload
          const webhookError = statusObj.errors?.[0];
          const webhookFailedReason: string | null = webhookError
            ? (webhookError.error_data?.details ??
               webhookError.error_user_msg ??
               webhookError.message ??
               webhookError.title ??
               "Unknown delivery failure")
            : null;
          const webhookMetaCode: number | null = webhookError?.code ?? null;
          const webhookMetaType: string | null = webhookError?.type ?? null;
          const webhookMetaSubcode: number | null = webhookError?.error_subcode ?? null;

          // Find the existing log entry for this WhatsApp message ID
          const [existingLog] = await db
            .select({
              id: deliveryLogs.id,
              status: deliveryLogs.status,
            })
            .from(deliveryLogs)
            .where(eq(deliveryLogs.whatsappMessageId, messageId))
            .limit(1);

          if (!existingLog) {
            console.log(`[WhatsApp Webhook] Message ID ${messageId} not found in database — skipping.`);
            continue;
          }

          const statusPriority: Record<string, number> = {
            pending: 0,
            sent: 1,
            delivered: 2,
            read: 3,
            failed: 99, // failed is terminal — always allow
          };

          const currentPriority = statusPriority[existingLog.status] ?? 0;
          const newPriority = statusPriority[status] ?? 0;

          if (status !== "failed" && newPriority <= currentPriority) {
            console.log(
              `[WhatsApp Webhook] Ignored out-of-order status for ${messageId}: current=${existingLog.status}, received=${status}`
            );
            continue;
          }

          // Build the update payload based on the incoming status
          const updateData: Record<string, unknown> = { status };

          if (status === "delivered") {
            updateData.deliveredAt = timestamp;
            updateData.errorMessage = null;
            updateData.webhookFailedReason = null;
          } else if (status === "read") {
            updateData.readAt = timestamp;
            updateData.deliveredAt = existingLog.status === "delivered" ? undefined : timestamp;
            updateData.errorMessage = null;
            updateData.webhookFailedReason = null;
          } else if (status === "failed") {
            updateData.webhookFailedReason = webhookFailedReason;
            updateData.errorMessage = webhookFailedReason ?? "Async delivery failure (webhook)";
            if (webhookMetaCode) updateData.metaErrorCode = webhookMetaCode;
            if (webhookMetaType) updateData.metaErrorType = webhookMetaType;
            if (webhookMetaSubcode) updateData.metaErrorSubcode = webhookMetaSubcode;
          } else if (status === "sent") {
            updateData.sentAt = timestamp;
          }

          console.log(
            `[WhatsApp Webhook] Updating message ${messageId}: ${existingLog.status} → ${status}` +
            (webhookMetaCode ? ` | Code: ${webhookMetaCode}` : "") +
            (webhookFailedReason ? ` | Reason: ${webhookFailedReason}` : "")
          );

          await db
            .update(deliveryLogs)
            .set(updateData as any)
            .where(eq(deliveryLogs.id, existingLog.id));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[WhatsApp Webhook] Error processing event:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
