"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Upload, ArrowLeft, ArrowUpDown, Calendar, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/lib/db/schema";
import { deleteUser, bulkUploadUsers } from "@/actions/users";
import { getUserDeliveryLogs } from "@/actions/delivery-logs";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SearchInput } from "@/components/dashboard/search-input";
import { Pagination } from "@/components/dashboard/pagination";
import { UserFormDialog } from "./user-form-dialog";
import { BulkUploadDialog } from "@/components/dashboard/bulk-upload-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { capitalize, formatDate } from "@/lib/utils";

interface LogItem {
  id: string;
  status: "sent" | "failed" | "pending";
  messageContent: string | null;
  errorMessage: string | null;
  whatsappMessageId: string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
}

interface UsersTableProps {
  initialUsers: User[];
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
  
  // Client state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortOrder, setSortOrder] = useState<"name_asc" | "name_desc" | "date_asc" | "date_desc">("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Detail view logs
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Synchronize state with initial props when revalidated
  const [prevInitialUsers, setPrevInitialUsers] = useState<User[]>(initialUsers);
  if (initialUsers !== prevInitialUsers) {
    setPrevInitialUsers(initialUsers);
    setAllUsers(initialUsers);
  }

  // Intercept selectedUserId changes during render to reset loading/error states
  const [prevSelectedUserId, setPrevSelectedUserId] = useState<string | null>(null);
  if (selectedUserId !== prevSelectedUserId) {
    setPrevSelectedUserId(selectedUserId);
    if (selectedUserId) {
      setLogsLoading(true);
      setLogsError(null);
      setLogs([]);
    }
  }

  // Fetch delivery history when a user details view is opened
  useEffect(() => {
    if (selectedUserId) {
      getUserDeliveryLogs(selectedUserId)
        .then((res) => {
          if (res.error) {
            setLogsError(res.error);
          } else if (res.logs) {
            const mapped = res.logs.map((log: any) => ({
              id: log.id,
              status: log.status as "sent" | "failed" | "pending",
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
          setLogsError(err.message || "Failed to load history.");
        })
        .finally(() => {
          setLogsLoading(false);
        });
    }
  }, [selectedUserId]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete user "${name}"?`)) return;
    const result = await deleteUser(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User deleted");
      if (selectedUserId === id) {
        setSelectedUserId(null);
      }
      router.refresh();
    }
  }

  // Filter and Sort users locally
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.phone.toLowerCase().includes(search.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(search.toLowerCase())) ||
      user.city.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortOrder === "name_asc") {
      return a.name.localeCompare(b.name);
    } else if (sortOrder === "name_desc") {
      return b.name.localeCompare(a.name);
    } else if (sortOrder === "date_asc") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Local Pagination
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = sortedUsers.slice(offset, offset + ITEMS_PER_PAGE);

  // Reset page when search or filters change
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevStatusFilter, setPrevStatusFilter] = useState(statusFilter);
  const [prevSortOrder, setPrevSortOrder] = useState(sortOrder);
  if (search !== prevSearch || statusFilter !== prevStatusFilter || sortOrder !== prevSortOrder) {
    setPrevSearch(search);
    setPrevStatusFilter(statusFilter);
    setPrevSortOrder(sortOrder);
    setCurrentPage(1);
  }

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);

  if (selectedUser) {
    return (
      <DashboardShell
        title="User Details"
        description={`View and manage profile details for ${selectedUser.name}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedUserId(null)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingUser(selectedUser);
                setDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit User
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => handleDelete(selectedUser.id, selectedUser.name)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Details Card */}
          <Card className="border-border/50 md:col-span-1">
            <CardHeader>
              <CardTitle>Profile Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Name</span>
                <p className="text-sm font-medium">{selectedUser.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Phone</span>
                <p className="text-sm font-medium font-mono">{selectedUser.phone}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Email</span>
                <p className="text-sm font-medium">{selectedUser.email || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">City</span>
                <p className="text-sm font-medium">{selectedUser.city}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Zodiac Sign</span>
                <p className="text-sm font-medium">{capitalize(selectedUser.zodiacSign)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Status</span>
                <div>
                  <Badge variant={selectedUser.status === "active" ? "success" : "secondary"}>
                    {selectedUser.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Joining Date</span>
                <p className="text-sm font-medium">{formatDate(selectedUser.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery History Timeline */}
          <Card className="border-border/50 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Delivery History</CardTitle>
              {logsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Fetching history logs...</span>
                </div>
              ) : logsError ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-destructive">
                  <AlertCircle className="h-8 w-8" />
                  <span className="text-xs font-medium">{logsError}</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center border border-dashed border-border rounded-lg p-6">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No history found</p>
                  <p className="text-xs text-muted-foreground">This subscriber hasn&apos;t received any briefings yet.</p>
                </div>
              ) : (
                <div className="relative max-h-[50vh] overflow-y-auto pr-2">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border/60" />
                  <div className="space-y-6">
                    {logs.map((log) => {
                      const isSent = log.status === "sent";
                      const isFailed = log.status === "failed";
                      return (
                        <div key={log.id} className="relative flex gap-4 pl-2">
                          <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                            {isSent ? (
                              <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              </div>
                            ) : isFailed ? (
                              <div className="h-4 w-4 rounded-full bg-destructive/20 border border-destructive flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-destructive" />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-amber-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                              <span className="font-semibold text-muted-foreground">
                                {formatDate(log.sentAt ?? log.createdAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                {log.whatsappMessageId && (
                                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded truncate max-w-[100px]">
                                    ID: {log.whatsappMessageId}
                                  </span>
                                )}
                                <Badge variant={isSent ? "success" : isFailed ? "destructive" : "warning"} className="text-[9px] py-0 px-1">
                                  {log.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs">
                              {log.messageContent ? (
                                <p className="whitespace-pre-wrap leading-relaxed font-mono text-muted-foreground">
                                  {log.messageContent}
                                </p>
                              ) : (
                                <p className="italic text-muted-foreground">No message saved.</p>
                              )}
                              {isFailed && log.errorMessage && (
                                <div className="mt-2 text-destructive border-t border-destructive/10 pt-1.5 font-sans">
                                  Error: {log.errorMessage}
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
            </CardContent>
          </Card>
        </div>

        <UserFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={editingUser}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Users"
      description="Manage subscribers receiving daily WhatsApp briefings"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="w-full max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search users..."
            />
          </div>
          
          {/* Sorting Dropdown with Sorting Icon */}
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
            <SelectTrigger className="w-[230px] gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Joining Date (Newest)</SelectItem>
              <SelectItem value="date_asc">Joining Date (Oldest)</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBulkDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => {
              setEditingUser(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
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
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Zodiac</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <span
                      onClick={() => setSelectedUserId(user.id)}
                      className="cursor-pointer hover:underline text-primary transition-colors hover:text-primary/80 font-medium"
                    >
                      {user.name}
                    </span>
                  </TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.city}</TableCell>
                  <TableCell>{capitalize(user.zodiacSign)}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "success" : "secondary"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingUser(user);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.id, user.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </motion.div>

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
      />

      <BulkUploadDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        type="users"
        onUpload={bulkUploadUsers}
      />
    </DashboardShell>
  );
}