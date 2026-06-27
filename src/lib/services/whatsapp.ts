import { formatPhone } from "@/lib/utils";
import type { WhatsAppSendResult } from "./types";

/**
 * Maps Meta WhatsApp Cloud API numeric error codes to human-readable explanations.
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
const META_ERROR_EXPLANATIONS: Record<number, string> = {
  131000: "Generic internal Meta system error. Retry with exponential backoff.",
  131005: "Access denied — your API token lacks permission to send messages.",
  131006: "Resource not found — phone number ID is invalid or not found in Meta.",
  131008: "Required parameter missing in the API request body.",
  131009: "A field in the request has an invalid value. Check phone format.",
  131016: "Meta WhatsApp service is temporarily unavailable. Retry later.",
  131021: "Recipient number is not a valid WhatsApp account.",
  131026: "Message undeliverable — number not on WhatsApp, outdated app version, or user hasn't accepted Meta ToS.",
  131030: "Recipient not in allowed list — sandbox restriction. Add this number in Meta Developer Console → Test Numbers.",
  131042: "Business account has a restriction or policy violation.",
  131047: "24-hour messaging window expired. A template message is required to re-engage.",
  131048: "Spam rate limit hit — too many messages sent to this user recently.",
  131049: "Message expired — could not be delivered within the time limit.",
  131051: "Unsupported message type for this recipient.",
  131052: "Failed to download media attachment.",
  131053: "Failed to upload media attachment.",
  132000: "Template parameter count mismatch.",
  132001: "Template does not exist in your WhatsApp Business account.",
  132005: "Template + language combination not found.",
  133000: "Incomplete de-registration of phone number.",
  133004: "Server temporarily unavailable. Retry later.",
  133005: "Phone number must be verified before sending.",
  133006: "Phone number is not registered with WhatsApp Business.",
  135000: "Generic user error — invalid request. Check all parameters.",
};

export function getMetaErrorExplanation(code: number | undefined | null): string {
  if (!code) return "Unknown error from Meta API.";
  return META_ERROR_EXPLANATIONS[code] ?? `Unknown Meta error code: ${code}. See https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes`;
}

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
      metaErrorCode: undefined,
      metaErrorType: "configuration_error",
      apiHttpStatus: undefined,
    };
  }

  const formattedPhone = formatPhone(phone);
  const requestBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "text",
    text: { preview_url: false, body: message },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const httpStatus = res.status;
    let data: any;

    try {
      data = await res.json();
    } catch {
      data = { raw: await res.text() };
    }

    if (!res.ok) {
      const metaError = data?.error ?? {};
      const code: number | undefined = metaError.code;
      const subcode: number | undefined = metaError.error_subcode;
      const type: string | undefined = metaError.type;
      const title: string | undefined = metaError.error_user_title;
      const msg: string =
        title ??
        metaError.message ??
        metaError.error_user_msg ??
        "Failed to send WhatsApp message";

      const explanation = getMetaErrorExplanation(code);

      console.error(
        `[WhatsApp API Error] HTTP ${httpStatus} | Code: ${code ?? "n/a"} | Type: ${type ?? "n/a"} | Subcode: ${subcode ?? "n/a"}\n` +
        `  Message: ${msg}\n  Explanation: ${explanation}\n  Phone: ${formattedPhone}\n` +
        `  Raw Response: ${JSON.stringify(data)}`
      );

      return {
        success: false,
        error: msg,
        metaErrorCode: code,
        metaErrorType: type,
        metaErrorSubcode: subcode,
        apiHttpStatus: httpStatus,
        rawApiResponse: { request: requestBody, response: data },
        formattedPhone,
      };
    }

    console.log(
      `[WhatsApp API] Message accepted | HTTP ${httpStatus} | MsgID: ${data.messages?.[0]?.id} | To: ${formattedPhone}`
    );

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      apiHttpStatus: httpStatus,
      rawApiResponse: { request: requestBody, response: data },
      formattedPhone,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown network error";
    console.error(`[WhatsApp API] Network/fetch error for ${formattedPhone}:`, error);
    return {
      success: false,
      error: msg,
      metaErrorType: "network_error",
      apiHttpStatus: undefined,
      rawApiResponse: { request: requestBody, error: msg },
      formattedPhone,
    };
  }
}
