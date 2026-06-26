"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { triggerAllBriefings } from "@/actions/briefing";

export function RunBriefingButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    const toastId = toast.loading("Triggering daily briefings for active users...");
    
    try {
      const res = await triggerAllBriefings();
      if (res.error) {
        toast.error(res.error, { id: toastId });
      } else {
        const successRes = res as { total: number; sent: number; failed: number };
        if (successRes.total === 0) {
          toast.info("No active users found or briefings are disabled in settings.", { id: toastId });
        } else {
          toast.success(
            `Briefings completed: ${successRes.sent} sent successfully, ${successRes.failed} failed.`,
            { id: toastId }
          );
        }
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTrigger}
      disabled={loading}
      className="w-full bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 hover:dark:bg-emerald-600 text-white gap-2 font-medium shadow-sm transition-all"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {loading ? "Sending Briefings..." : "Trigger Daily Briefing"}
    </Button>
  );
}
