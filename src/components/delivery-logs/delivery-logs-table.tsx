"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Eye } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

interface DeliveryLogRow {
  id: string;
  status: "pending" | "sent" | "failed";
  messageContent: string | null;
  errorMessage: string | null;
  whatsappMessageId: string | null;
  sentAt: Date | null;
  createdAt: Date;
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
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
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
      description="Track WhatsApp briefing delivery history and errors"
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
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
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
              <TableHead>Message ID</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No delivery logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.userName}</TableCell>
                  <TableCell>{log.userPhone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "sent"
                          ? "success"
                          : log.status === "failed"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-muted-foreground">
                    {log.whatsappMessageId ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(log.sentAt ?? log.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-destructive">
                    {log.errorMessage ?? "—"}
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