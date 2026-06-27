"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { capitalize, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  Calendar,
  Phone,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCheck,
  Send,
  BookOpen,
  XCircle,
  Wifi,
  ShieldAlert,
} from "lucide-react";
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

function getMetaErrorExplanation(code: number | undefined | null): string {
  if (!code) return "Unknown error from Meta API.";
  return META_ERROR_EXPLANATIONS[code] ?? `Unknown Meta error code: ${code}. See https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes`;
}

interface DeliveryLogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: {
    id: string;
    status: "pending" | "sent" | "delivered" | "read" | "failed";
    messageContent: string | null;
    errorMessage: string | null;
    whatsappMessageId: string | null;
    sentAt: Date | string | null;
    createdAt: Date | string;
    metaErrorCode?: number | null;
    metaErrorType?: string | null;
    metaErrorSubcode?: number | null;
    apiHttpStatus?: number | null;
    rawApiResponse?: unknown;
    deliveredAt?: Date | string | null;
    readAt?: Date | string | null;
    webhookFailedReason?: string | null;
    userName: string;
    userPhone: string;
    weatherData?: any;
    goldData?: any;
    sensexData?: any;
    horoscopeData?: any;
  } | null;
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; description: string }
> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Pending",
    color: "text-yellow-600",
    description: "Queued, not yet dispatched to Meta API.",
  },
  sent: {
    icon: <Send className="h-3.5 w-3.5" />,
    label: "Sent (API Accepted)",
    color: "text-blue-600",
    description:
      "Meta API accepted the message and returned a message ID. Awaiting async delivery confirmation via webhook.",
  },
  delivered: {
    icon: <CheckCheck className="h-3.5 w-3.5" />,
    label: "Delivered",
    color: "text-emerald-600",
    description: "Meta webhook confirmed the message reached the recipient's device.",
  },
  read: {
    icon: <BookOpen className="h-3.5 w-3.5" />,
    label: "Read",
    color: "text-indigo-600",
    description: "Meta webhook confirmed the recipient opened and read the message.",
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Failed",
    color: "text-red-600",
    description: "Delivery failed. See error details below.",
  },
};

function TimelineDot({ filled, active }: { filled: boolean; active?: boolean }) {
  return (
    <div
      className={`h-2.5 w-2.5 rounded-full border-2 ${
        filled
          ? active
            ? "border-primary bg-primary"
            : "border-emerald-500 bg-emerald-500"
          : "border-muted-foreground/30 bg-transparent"
      }`}
    />
  );
}

export function DeliveryLogDetailDialog({
  open,
  onOpenChange,
  log,
}: DeliveryLogDetailDialogProps) {
  const [rawExpanded, setRawExpanded] = useState(false);

  if (!log) return null;

  const statusCfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
  const metaExplanation = log.metaErrorCode
    ? getMetaErrorExplanation(log.metaErrorCode)
    : null;

  const badgeVariant =
    log.status === "read"
      ? "success"
      : log.status === "delivered"
        ? "default"
        : log.status === "sent"
          ? "secondary"
          : log.status === "failed"
            ? "destructive"
            : "warning";

  // Delivery timeline steps
  const timeline = [
    {
      label: "Created",
      time: log.createdAt,
      done: true,
      icon: <Clock className="h-3 w-3" />,
    },
    {
      label: "Sent to Meta API",
      time: log.sentAt,
      done: !!log.sentAt,
      icon: <Send className="h-3 w-3" />,
    },
    {
      label: "Delivered to Device",
      time: log.deliveredAt,
      done: !!log.deliveredAt,
      icon: <CheckCheck className="h-3 w-3" />,
    },
    {
      label: "Read by Recipient",
      time: log.readAt,
      done: !!log.readAt,
      icon: <BookOpen className="h-3 w-3" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={badgeVariant} className="flex items-center gap-1">
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
            {log.apiHttpStatus && (
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                  log.apiHttpStatus === 200
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                HTTP {log.apiHttpStatus}
              </span>
            )}
            {log.whatsappMessageId && (
              <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded truncate max-w-[160px]">
                {log.whatsappMessageId}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold">Delivery Log Details</DialogTitle>
          <p className="text-xs text-muted-foreground">{statusCfg.description}</p>
        </DialogHeader>

        {/* ── Failure Section ── */}
        {log.status === "failed" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Delivery Failure Details
            </div>

            {/* API Error */}
            {log.errorMessage && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Error Message
                </p>
                <p className="font-mono text-xs text-destructive bg-destructive/10 rounded p-2">
                  {log.errorMessage}
                </p>
              </div>
            )}

            {/* Webhook-specific failure */}
            {log.webhookFailedReason && log.webhookFailedReason !== log.errorMessage && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Webhook Failure Reason
                </p>
                <p className="font-mono text-xs text-orange-600 bg-orange-500/10 rounded p-2">
                  {log.webhookFailedReason}
                </p>
              </div>
            )}

            {/* Meta Error Codes */}
            {(log.metaErrorCode || log.metaErrorType || log.metaErrorSubcode) && (
              <div className="grid grid-cols-3 gap-2">
                {log.metaErrorCode && (
                  <div className="rounded bg-muted/50 p-2 space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Code</p>
                    <p className="font-mono text-sm font-bold text-destructive">#{log.metaErrorCode}</p>
                  </div>
                )}
                {log.metaErrorType && (
                  <div className="rounded bg-muted/50 p-2 space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Type</p>
                    <p className="font-mono text-xs text-foreground">{log.metaErrorType}</p>
                  </div>
                )}
                {log.metaErrorSubcode && (
                  <div className="rounded bg-muted/50 p-2 space-y-0.5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Subcode</p>
                    <p className="font-mono text-xs text-foreground">#{log.metaErrorSubcode}</p>
                  </div>
                )}
              </div>
            )}

            {/* Human-readable explanation */}
            {metaExplanation && (
              <div className="flex gap-2 items-start rounded bg-amber-500/10 border border-amber-500/20 p-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-amber-700 mb-0.5">What this means</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">{metaExplanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Delivery Timeline ── */}
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
          <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-3">
            Delivery Timeline
          </h3>
          <div className="space-y-2">
            {timeline.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <TimelineDot filled={step.done} active={idx === timeline.filter(s => s.done).length - 1} />
                <span className={`text-xs font-medium ${step.done ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {step.label}
                </span>
                {step.done && step.time && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                    {formatDate(step.time)}
                  </span>
                )}
                {!step.done && (
                  <span className="ml-auto text-[10px] italic text-muted-foreground/40">
                    {log.status === "failed" && idx >= 1 ? "Blocked" : "Pending"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* ── Metadata & API Payloads ── */}
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">
                Subscriber Info
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{log.userName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{log.userPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(log.createdAt)}</span>
              </div>
            </div>

            {/* Weather Payload Card */}
            {log.weatherData && (
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  🌤 Weather Payload
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">City:</span>
                    <p className="font-semibold">{log.weatherData.city}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Temp:</span>
                    <p className="font-semibold">{log.weatherData.temperature}°C</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Condition:</span>
                    <p className="font-semibold">{capitalize(log.weatherData.condition)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Humidity:</span>
                    <p className="font-semibold">{log.weatherData.humidity}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Gold & Sensex Payload Cards */}
            {(log.goldData || log.sensexData) && (
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
                {log.goldData && (
                  <div className="space-y-1.5 border-b border-border/50 pb-2.5">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                      🥇 Gold Price
                    </h4>
                    <p className="text-sm font-semibold">
                      ₹{log.goldData.pricePer10g?.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">
                        ({log.goldData.changePercent >= 0 ? "▲" : "▼"} {Math.abs(log.goldData.changePercent)}%)
                      </span>
                    </p>
                  </div>
                )}
                {log.sensexData && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                      📈 BSE Sensex
                    </h4>
                    {log.sensexData.value ? (
                      <p className="text-sm font-semibold">
                        {log.sensexData.value?.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground ml-1.5">
                          ({log.sensexData.changePercent >= 0 ? "▲" : "▼"} {Math.abs(log.sensexData.changePercent)}%)
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No index data available</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Horoscope Card */}
            {log.horoscopeData && (
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                  🔮 Horoscope ({capitalize(log.horoscopeData.sign)})
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  &ldquo;{log.horoscopeData.description}&rdquo;
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground pt-1">
                  <div>Mood: <span className="font-semibold text-foreground">{log.horoscopeData.mood}</span></div>
                  <div>Lucky #: <span className="font-semibold text-foreground">{log.horoscopeData.luckyNumber}</span></div>
                </div>
              </div>
            )}

            {/* Raw API Response */}
            {log.rawApiResponse && (
              <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                <button
                  className="flex items-center justify-between w-full text-xs font-bold uppercase text-muted-foreground tracking-wider"
                  onClick={() => setRawExpanded(!rawExpanded)}
                >
                  🔧 Raw API Response
                  {rawExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {rawExpanded && (
                  <pre className="font-mono text-[10px] text-muted-foreground bg-muted/30 rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                    {JSON.stringify(log.rawApiResponse, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Generated Message Content */}
          <div className="md:col-span-3 space-y-2 flex flex-col">
            <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> Message Content
            </h3>
            {log.messageContent ? (
              <div className="flex-1 rounded-lg border border-border/50 bg-muted/30 p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[45vh] overflow-y-auto">
                {log.messageContent}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground italic bg-muted/10">
                No message content was generated.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
