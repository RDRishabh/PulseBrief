"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  Eye,
  Clock,
  Send,
  CheckCheck,
  BookOpen,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { DeliveryLogDetailDialog } from "./delivery-log-detail-dialog";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SearchInput } from "@/components/dashboard/search-input";
import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";

interface DeliveryLogRow {
  id: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  messageContent: string | null;
  errorMessage: string | null;
  whatsappMessageId: string | null;
  sentAt: Date | null;
  createdAt: Date;
  metaErrorCode: number | null;
  metaErrorType: string | null;
  metaErrorSubcode: number | null;
  apiHttpStatus: number | null;
  rawApiResponse: unknown | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  webhookFailedReason: string | null;
  userName: string;
  userPhone: string;
}

interface DeliveryLogsTableProps {
  logs: DeliveryLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  initialSearch: string;
  initialStatus: string;
}

// ── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ log }: { log: DeliveryLogRow }) {
  const config: Record<
    string,
    {
      icon: React.ReactNode;
      label: string;
      variant: "default" | "secondary" | "destructive" | "success" | "warning";
      tooltip: string;
    }
  > = {
    pending: {
      icon: <Clock className="h-3 w-3" />,
      label: "Pending",
      variant: "warning",
      tooltip: "Message is queued — not yet sent to Meta API.",
    },
    sent: {
      icon: <Send className="h-3 w-3" />,
      label: "Sent",
      variant: "secondary",
      tooltip:
        "Meta API accepted the message. Awaiting async delivery confirmation via webhook.",
    },
    delivered: {
      icon: <CheckCheck className="h-3 w-3" />,
      label: "Delivered",
      variant: "default",
      tooltip: "Confirmed by Meta webhook — message reached the recipient's device.",
    },
    read: {
      icon: <BookOpen className="h-3 w-3" />,
      label: "Read",
      variant: "success",
      tooltip: "Confirmed by Meta webhook — recipient opened the message.",
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Failed",
      variant: "destructive",
      tooltip: log.errorMessage ?? log.webhookFailedReason ?? "Delivery failed.",
    },
  };

  const cfg = config[log.status] ?? config["pending"];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={cfg.variant}
            className="flex items-center gap-1 cursor-help w-fit"
          >
            {cfg.icon}
            {cfg.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-xs">{cfg.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Error code pill ───────────────────────────────────────────────────────────
function ErrorCodePill({ code, httpStatus }: { code: number | null; httpStatus: number | null }) {
  if (!code && !httpStatus) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {code && (
        <span className="font-mono text-[11px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded w-fit">
          #{code}
        </span>
      )}
      {httpStatus && httpStatus !== 200 && (
        <span className="font-mono text-[10px] text-muted-foreground">
          HTTP {httpStatus}
        </span>
      )}
    </div>
  );
}

export function DeliveryLogsTable({
  logs,
  pagination,
  initialSearch,
  initialStatus,
}: DeliveryLogsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);

  // Dialog state
  const [selectedLog, setSelectedLog] = useState<DeliveryLogRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    startTransition(() => router.push(`/delivery-logs?${params.toString()}`));
  }

  return (
    <DashboardShell
      title="Delivery Logs"
      description="Track WhatsApp briefing delivery history — sent, delivered, read, and every failure"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by user name..."
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateParams({ search, page: "1" })}
        >
          Search
        </Button>
        <Select
          value={initialStatus}
          onValueChange={(v) => updateParams({ status: v, page: "1" })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-border/50"
      >
        {isPending && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 cursor-help">
                      Error Code <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Meta error code + HTTP status</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>Message ID</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Delivered At</TableHead>
              <TableHead className="max-w-[220px]">Error Detail</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No delivery logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.userName}</TableCell>
                  <TableCell className="font-mono text-sm">{log.userPhone}</TableCell>
                  <TableCell>
                    <StatusBadge log={log} />
                  </TableCell>
                  <TableCell>
                    <ErrorCodePill
                      code={log.metaErrorCode}
                      httpStatus={log.apiHttpStatus}
                    />
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-muted-foreground font-mono text-[11px]">
                    {log.whatsappMessageId ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.sentAt ? formatDate(log.sentAt) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.deliveredAt ? (
                      <span className="text-green-600 dark:text-green-400">
                        {formatDate(log.deliveredAt)}
                      </span>
                    ) : log.readAt ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        {formatDate(log.readAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 italic text-xs">
                        {log.status === "sent" ? "Awaiting…" : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    {(log.errorMessage ?? log.webhookFailedReason) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="truncate text-destructive text-xs cursor-help">
                              {log.errorMessage ?? log.webhookFailedReason}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px] text-xs">
                            {log.errorMessage}
                            {log.webhookFailedReason && log.webhookFailedReason !== log.errorMessage && (
                              <><br /><span className="text-orange-400">Webhook: {log.webhookFailedReason}</span></>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedLog(log);
                        setDetailOpen(true);
                      }}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => updateParams({ page: String(p) })}
        />
      </motion.div>

      <DeliveryLogDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={selectedLog}
      />
    </DashboardShell>
  );
}