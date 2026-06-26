"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserHistoryTrigger } from "./user-history-trigger";
import { DeliveryLogDetailDialog } from "@/components/delivery-logs/delivery-log-detail-dialog";
import { formatDate } from "@/lib/utils";

interface RecentDeliveriesProps {
  recentLogs: any[];
}

export function RecentDeliveries({ recentLogs }: RecentDeliveriesProps) {
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleOpenDetails = (log: any) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  return (
    <>
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No deliveries yet
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      <UserHistoryTrigger userId={log.userId} userName={log.userName}>
                        {log.userName}
                      </UserHistoryTrigger>
                    </TableCell>
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
                    <TableCell className="text-muted-foreground">
                      {formatDate(log.sentAt ?? log.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDetails(log)}
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
        </CardContent>
      </Card>

      <DeliveryLogDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={selectedLog}
      />
    </>
  );
}
