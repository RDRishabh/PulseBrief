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

    // Meta Webhook status payload structure parsing
    const entries = payload.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        const value = change.value ?? {};
        const statuses = value.statuses ?? [];

        for (const statusObj of statuses) {
          const messageId = statusObj.id;
          const status = statusObj.status; // "sent" | "delivered" | "read" | "failed"

          if (!messageId || !status) continue;

          // Resolve error message if failure occurred
          const errorMsg =
            statusObj.errors?.[0]?.message ??
            statusObj.errors?.[0]?.title ??
            "Unknown delivery failure";

          // Fetch current log to verify state progression
          const [existingLog] = await db
            .select({ status: deliveryLogs.status })
            .from(deliveryLogs)
            .where(eq(deliveryLogs.whatsappMessageId, messageId))
            .limit(1);

          if (existingLog) {
            const statusPriority: Record<string, number> = {
              pending: 0,
              sent: 1,
              delivered: 2,
              read: 3,
              failed: 4, // Failed status is treated as terminal
            };

            const currentPriority = statusPriority[existingLog.status] ?? 0;
            const newPriority = statusPriority[status] ?? 0;

            // Only update if it is a failure or represents forward progression (no downgrades)
            if (status === "failed" || newPriority > currentPriority) {
              const updateData: any = { status };

              if (status === "failed") {
                updateData.errorMessage = errorMsg;
              } else {
                updateData.errorMessage = null; // Clear any previous errors if it succeeded
              }

              // Update sentAt if it's not already logged
              if (status === "sent" || status === "delivered" || status === "read") {
                updateData.sentAt = new Date();
              }

              console.log(
                `[WhatsApp Webhook] Updating message ${messageId}: ${existingLog.status} -> ${status}`
              );

              await db
                .update(deliveryLogs)
                .set(updateData)
                .where(eq(deliveryLogs.whatsappMessageId, messageId));
            } else {
              console.log(
                `[WhatsApp Webhook] Ignored out-of-order status downgrade for message ${messageId}: current=${existingLog.status}, received=${status}`
              );
            }
          } else {
            console.log(`[WhatsApp Webhook] Message ID ${messageId} not found in database.`);
          }
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
