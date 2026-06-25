"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "users" | "quotes";
  onUpload: (data: any[]) => Promise<{ success?: boolean; error?: string; count?: number }>;
}

const TEMPLATE_HEADERS = {
  users: ["name", "phone", "email", "city", "zodiacSign", "status"],
  quotes: ["text", "author", "category", "isActive"],
};

const TEMPLATE_SAMPLE = {
  users: ["Rahul Kumar", "+919876543210", "rahul@example.com", "Mumbai", "leo", "active"],
  quotes: ["The only way to do great work is to love what you do.", "Steve Jobs", "motivation", "true"],
};

export function BulkUploadDialog({ open, onOpenChange, type, onUpload }: BulkUploadDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const headers = TEMPLATE_HEADERS[type];
    const sample = TEMPLATE_SAMPLE[type];
    
    // Format quote fields to escape quotes for CSV if necessary
    const formattedSample = sample.map(val => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });

    const csvContent = [headers.join(","), formattedSample.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${type}_bulk_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== "text/csv" && !selected.name.endsWith(".csv")) {
        setErrorMessage("Please upload a valid CSV file.");
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      if (selected.type !== "text/csv" && !selected.name.endsWith(".csv")) {
        setErrorMessage("Please upload a valid CSV file.");
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMessage(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;

    setIsPending(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsedData = parseCSV(text);

        if (parsedData.length === 0) {
          setErrorMessage("The uploaded file has no data rows.");
          setIsPending(false);
          return;
        }

        // Basic check: verify first row contains at least some of the required columns
        const parsedHeaders = Object.keys(parsedData[0]);
        const requiredHeaders = TEMPLATE_HEADERS[type];
        const missingHeaders = requiredHeaders.filter(
          h => !parsedHeaders.some(ph => ph.toLowerCase().trim() === h.toLowerCase().trim())
        );

        // Name, phone (users) or text, author (quotes) are strictly required headers
        const criticalMissing = type === "users" 
          ? missingHeaders.filter(h => h === "name" || h === "phone")
          : missingHeaders.filter(h => h === "text" || h === "author");

        if (criticalMissing.length > 0) {
          setErrorMessage(`Invalid template headers. Missing: ${criticalMissing.join(", ")}`);
          setIsPending(false);
          return;
        }

        const result = await onUpload(parsedData);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          toast.success(`Successfully uploaded ${result.count || parsedData.length} ${type}!`);
          setFile(null);
          onOpenChange(false);
          router.refresh();
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to process CSV file.");
      } finally {
        setIsPending(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Error reading CSV file.");
      setIsPending(false);
    };

    reader.readAsText(file);
  };

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Parse the header row and normalize
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    if (headers.length === 0) return [];
    
    const result: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        let val = values[index] || "";
        row[header] = val;
      });
      result.push(row);
    }
    return result;
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cleanValue(current));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(cleanValue(current));
    return result;
  }

  function cleanValue(val: string): string {
    let res = val.trim();
    if (res.startsWith('"') && res.endsWith('"')) {
      res = res.slice(1, -1);
    }
    return res.replace(/""/g, '"');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!isPending) {
        onOpenChange(o);
        if (!o) {
          setFile(null);
          setErrorMessage(null);
        }
      }
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload {type === "users" ? "Users" : "Quotes"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Import multiple {type} in bulk using a CSV file. Make sure your file follows the standard format.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download Template Block */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/40 p-3 text-sm">
            <div className="space-y-0.5">
              <span className="font-medium text-foreground">Need a CSV template?</span>
              <p className="text-xs text-muted-foreground">Download the correct format schema.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-3.5 w-3.5" />
              Template
            </Button>
          </div>

          {/* Guidelines info block */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-500/90 space-y-1">
            <span className="font-semibold">Note on formatting:</span>
            {type === "users" ? (
              <ul className="list-disc list-inside space-y-0.5">
                <li><code className="text-amber-500 font-bold">name</code> and <code className="text-amber-500 font-bold">phone</code> are mandatory.</li>
                <li><code className="text-amber-500 font-bold">status</code> can be <code className="italic">active</code> or <code className="italic">inactive</code>.</li>
                <li><code className="text-amber-500 font-bold">zodiacSign</code> must be a valid lower-case zodiac sign name.</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-0.5">
                <li><code className="text-amber-500 font-bold">text</code> (minimum 10 characters) and <code className="text-amber-500 font-bold">author</code> are mandatory.</li>
                <li><code className="text-amber-500 font-bold">category</code> must be <code className="italic">motivation</code>, <code className="italic">wisdom</code>, <code className="italic">success</code>, <code className="italic">life</code>, or <code className="italic">business</code>.</li>
                <li><code className="text-amber-500 font-bold">isActive</code> can be <code className="italic">true</code> or <code className="italic">false</code>.</li>
              </ul>
            )}
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-8 cursor-pointer bg-muted/20"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            {file ? (
              <div className="text-center">
                <span className="font-medium text-sm text-foreground block truncate max-w-[280px]">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div className="text-center">
                <span className="font-medium text-sm text-foreground">Click to upload or drag & drop</span>
                <p className="text-xs text-muted-foreground mt-0.5">CSV files only</p>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">Upload Error</span>
                <p className="leading-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!file || isPending}
              onClick={handleUploadSubmit}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
