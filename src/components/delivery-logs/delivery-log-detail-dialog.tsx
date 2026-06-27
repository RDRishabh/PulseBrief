"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { capitalize, formatDate } from "@/lib/utils";
import { AlertCircle, Calendar, Phone, User, MessageSquare, Tag } from "lucide-react";

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
    userName: string;
    userPhone: string;
    weatherData?: any;
    goldData?: any;
    sensexData?: any;
    horoscopeData?: any;
  } | null;
}

export function DeliveryLogDetailDialog({
  open,
  onOpenChange,
  log,
}: DeliveryLogDetailDialogProps) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={
                log.status === "read"
                  ? "success"
                  : log.status === "delivered"
                    ? "default"
                    : log.status === "sent"
                      ? "secondary"
                      : log.status === "failed"
                        ? "destructive"
                        : "warning"
              }
            >
              {capitalize(log.status)}
            </Badge>
            {log.whatsappMessageId && (
              <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                Msg ID: {log.whatsappMessageId}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Delivery Log Details
          </DialogTitle>
        </DialogHeader>

        {/* Error Message Section */}
        {log.status === "failed" && log.errorMessage && (
          <div className="flex gap-2 items-start rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Delivery Failure Reason</span>
              <p className="font-mono text-xs">{log.errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-5 mt-2">
          {/* Metadata & API Payloads */}
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
                <span>{formatDate(log.sentAt ?? log.createdAt)}</span>
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
