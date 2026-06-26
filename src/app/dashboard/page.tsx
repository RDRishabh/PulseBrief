import { AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { UserHistoryTrigger } from "@/components/dashboard/user-history-trigger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardStats } from "@/actions/dashboard";
import { formatDate } from "@/lib/utils";
import { RunBriefingButton } from "@/components/dashboard/run-briefing-button";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <DashboardShell
      title="Overview"
      description="Monitor your WhatsApp daily briefing platform"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="users"
          index={0}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon="users"
          index={1}
        />
        <StatCard
          title="Active Quotes"
          value={stats.totalQuotes}
          icon="quote"
          index={2}
        />
        <StatCard
          title="Deliveries Sent"
          value={stats.sentDeliveries}
          change={stats.deliveryChange}
          icon="send"
          index={3}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No deliveries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentLogs.map((log) => (
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <span className="text-sm text-muted-foreground">Failed Deliveries</span>
              <span className="font-semibold">{stats.failedDeliveries}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <span className="font-semibold">
                {stats.sentDeliveries + stats.failedDeliveries > 0
                  ? Math.round(
                      (stats.sentDeliveries /
                        (stats.sentDeliveries + stats.failedDeliveries)) *
                        100
                    )
                  : 100}
                %
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <span className="text-sm text-muted-foreground">Next Briefing</span>
              <span className="font-semibold">7:00 AM IST</span>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">
                Cron runs daily at 1:30 AM UTC (7:00 AM IST) via Vercel Cron.
              </p>
            </div>
            <div className="border-t border-border/50 pt-4 mt-2">
              <RunBriefingButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}