"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Calendar, MessageSquare, AlertCircle, CheckCircle, Check, CheckCheck, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getUserDeliveryLogs } from "@/actions/delivery-logs";
import { formatDate } from "@/lib/utils";

interface LogItem {
  id: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  messageContent: string | null;
  errorMessage: string | null;
  whatsappMessageId: string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
}

interface UserHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function UserHistoryDialog({ open, onOpenChange, userId, userName }: UserHistoryDialogProps) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevUserId, setPrevUserId] = useState(userId);

  if (open !== prevOpen || userId !== prevUserId) {
    setPrevOpen(open);
    setPrevUserId(userId);
    if (open && userId) {
      setLoading(true);
      setError(null);
      setLogs([]);
    }
  }

  useEffect(() => {
    if (open && userId) {
      getUserDeliveryLogs(userId)
        .then((res) => {
          if (res.error) {
            setError(res.error);
          } else if (res.logs) {
            // Map the logs to match the expected interface type
            const mapped = res.logs.map((log: any) => ({
              id: log.id,
              status: log.status as "pending" | "sent" | "delivered" | "read" | "failed",
              messageContent: log.messageContent,
              errorMessage: log.errorMessage,
              whatsappMessageId: log.whatsappMessageId,
              sentAt: log.sentAt,
              createdAt: log.createdAt,
            }));
            setLogs(mapped);
          }
        })
        .catch((err: any) => {
          setError(err.message || "Failed to load history.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span>Delivery History:</span>
            <span className="text-primary font-semibold truncate max-w-[280px]">
              {userName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading history...</span>
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No Delivery History</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                This user has not received any WhatsApp daily briefings yet.
              </p>
            </div>
          ) : (
            <div className="relative max-h-[60vh] overflow-y-auto pr-2">
              {/* Vertical timeline line */}
              <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border/60" />

              <div className="space-y-6">
                {logs.map((log) => {
                  const dateStr = formatDate(log.sentAt ?? log.createdAt);
                  const isFailed = log.status === "failed";

                  return (
                    <div key={log.id} className="relative flex gap-4 pl-4">
                      {/* Timeline dot / status icon */}
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                        {log.status === "read" ? (
                          <div className="h-5.5 w-5.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center" title="Read by user">
                            <CheckCheck className="h-3 w-3 text-emerald-400" />
                          </div>
                        ) : log.status === "delivered" ? (
                          <div className="h-5.5 w-5.5 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center" title="Delivered to device">
                            <CheckCheck className="h-3 w-3 text-sky-400" />
                          </div>
                        ) : log.status === "sent" ? (
                          <div className="h-5.5 w-5.5 rounded-full bg-muted border border-border flex items-center justify-center" title="Sent from system">
                            <Check className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ) : isFailed ? (
                          <div className="h-5.5 w-5.5 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center" title="Delivery failed">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          </div>
                        ) : (
                          <div className="h-5.5 w-5.5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center" title="Pending send">
                            <Clock className="h-3 w-3 text-amber-500" />
                          </div>
                        )}
                      </div>

                      {/* Content block */}
                      <div className="flex-1 space-y-2">
                        {/* Meta header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {dateStr}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {log.whatsappMessageId && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]">
                                ID: {log.whatsappMessageId}
                              </span>
                            )}
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
                              className="text-[10px] py-0 px-1.5"
                            >
                              {log.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Message content bubble */}
                        <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 text-sm space-y-2">
                          {log.messageContent ? (
                            <p className="whitespace-pre-wrap leading-relaxed text-foreground text-xs font-mono bg-muted/40 p-2.5 rounded-lg border border-border/30">
                              {log.messageContent}
                            </p>
                          ) : (
                            <p className="italic text-muted-foreground text-xs">
                              No message content saved.
                            </p>
                          )}

                          {isFailed && log.errorMessage && (
                            <div className="flex gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-semibold">Delivery Failure</span>
                                <p className="leading-normal">{log.errorMessage}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
