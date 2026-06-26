"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Upload, ArrowLeft, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import type { Quote } from "@/lib/db/schema";
import { deleteQuote, bulkUploadQuotes } from "@/actions/quotes";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SearchInput } from "@/components/dashboard/search-input";
import { Pagination } from "@/components/dashboard/pagination";
import { QuoteFormDialog } from "./quote-form-dialog";
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
import { quoteCategories } from "@/lib/validations";
import { capitalize, formatDate } from "@/lib/utils";

interface QuotesTableProps {
  initialQuotes: Quote[];
}

export function QuotesTable({ initialQuotes }: QuotesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [allQuotes, setAllQuotes] = useState<Quote[]>(initialQuotes);

  // Client state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"text_asc" | "text_desc" | "date_asc" | "date_desc">("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Delete confirm dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [quoteToDeleteId, setQuoteToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Synchronize state with initial props when revalidated
  const [prevInitialQuotes, setPrevInitialQuotes] = useState<Quote[]>(initialQuotes);
  if (initialQuotes !== prevInitialQuotes) {
    setPrevInitialQuotes(initialQuotes);
    setAllQuotes(initialQuotes);
  }

  async function handleDeleteClick(id: string) {
    setQuoteToDeleteId(id);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!quoteToDeleteId) return;
    setIsDeleting(true);
    try {
      const result = await deleteQuote(quoteToDeleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Quote deleted");
        if (selectedQuoteId === quoteToDeleteId) {
          setSelectedQuoteId(null);
        }
        setQuoteToDeleteId(null);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  // Filter and Sort quotes locally
  const filteredQuotes = allQuotes.filter((quote) => {
    const matchesSearch =
      quote.text.toLowerCase().includes(search.toLowerCase()) ||
      quote.author.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "all" || quote.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    if (sortOrder === "text_asc") {
      return a.text.localeCompare(b.text);
    } else if (sortOrder === "text_desc") {
      return b.text.localeCompare(a.text);
    } else if (sortOrder === "date_asc") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Local Pagination
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sortedQuotes.length / ITEMS_PER_PAGE);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedQuotes = sortedQuotes.slice(offset, offset + ITEMS_PER_PAGE);

  // Reset page when filters change
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevCategoryFilter, setPrevCategoryFilter] = useState(categoryFilter);
  const [prevSortOrder, setPrevSortOrder] = useState(sortOrder);
  if (search !== prevSearch || categoryFilter !== prevCategoryFilter || sortOrder !== prevSortOrder) {
    setPrevSearch(search);
    setPrevCategoryFilter(categoryFilter);
    setPrevSortOrder(sortOrder);
    setCurrentPage(1);
  }

  const selectedQuote = allQuotes.find((q) => q.id === selectedQuoteId);

  if (selectedQuote) {
    return (
      <DashboardShell
        title="Quote Details"
        description="View and manage quote contents"
      >
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedQuoteId(null)}
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
                setEditingQuote(selectedQuote);
                setDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit Quote
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => handleDeleteClick(selectedQuote.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <Card className="border-border/50 max-w-2xl">
          <CardHeader>
            <CardTitle>Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Quote Text</span>
              <p className="text-base font-medium italic border-l-2 border-primary/50 pl-3 py-1 bg-muted/20 rounded">
                &ldquo;{selectedQuote.text}&rdquo;
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Author</span>
              <p className="text-sm font-medium">{selectedQuote.author}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Category</span>
              <div>
                <Badge variant="outline">{capitalize(selectedQuote.category)}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Status</span>
              <div>
                <Badge variant={selectedQuote.isActive ? "success" : "secondary"}>
                  {selectedQuote.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Date Added</span>
              <p className="text-sm font-medium">{formatDate(selectedQuote.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <QuoteFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          quote={editingQuote}
        />
        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Quote"
          description="Are you sure you want to delete this quote? This action cannot be undone."
          loading={isDeleting}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Quotes"
      description="Manage the quote library for daily WhatsApp delivery"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="w-full max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search quotes..."
            />
          </div>

          {/* Sorting Dropdown with Sorting Icon */}
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
            <SelectTrigger className="w-[230px] gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Date Added (Newest)</SelectItem>
              <SelectItem value="date_asc">Date Added (Oldest)</SelectItem>
              <SelectItem value="text_asc">Quote Text (A-Z)</SelectItem>
              <SelectItem value="text_desc">Quote Text (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {quoteCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {capitalize(cat)}
                </SelectItem>
              ))}
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
              setEditingQuote(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Quote
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
              <TableHead className="w-[45%]">Quote</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No quotes found
                </TableCell>
              </TableRow>
            ) : (
              paginatedQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="max-w-xs truncate font-medium">
                    <span
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className="cursor-pointer hover:underline text-primary transition-colors hover:text-primary/80 font-medium"
                    >
                      {quote.text}
                    </span>
                  </TableCell>
                  <TableCell>{quote.author}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{capitalize(quote.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={quote.isActive ? "success" : "secondary"}>
                      {quote.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(quote.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingQuote(quote);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(quote.id)}
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

      <QuoteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        quote={editingQuote}
      />

      <BulkUploadDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        type="quotes"
        onUpload={bulkUploadQuotes}
      />

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Quote"
        description="Are you sure you want to delete this quote? This action cannot be undone."
        loading={isDeleting}
      />
    </DashboardShell>
  );
}