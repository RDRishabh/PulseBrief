import { formatPhone } from "@/lib/utils";
import type { WhatsAppSendResult } from "./types";

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";

  if (!token || !phoneNumberId) {
    if (process.env.NODE_ENV === "development") {
      console.log("[WhatsApp Dev Mode]", { phone, message });
      return { success: true, messageId: `dev_${Date.now()}` };
    }
    return {
      success: false,
      error: "WhatsApp API credentials not configured",
    };
  }

  const formattedPhone = formatPhone(phone);

  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("[WhatsApp API Error Response]:", JSON.stringify(data, null, 2));
      return {
        success: false,
        error: data.error?.message ?? "Failed to send WhatsApp message",
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}