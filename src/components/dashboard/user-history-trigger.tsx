"use client";

import { useState } from "react";
import { UserHistoryDialog } from "./user-history-dialog";
import { cn } from "@/lib/utils";

interface UserHistoryTriggerProps {
  userId: string;
  userName: string;
  className?: string;
  children: React.ReactNode;
}

export function UserHistoryTrigger({
  userId,
  userName,
  className,
  children,
}: UserHistoryTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        className={cn(
          "cursor-pointer hover:underline text-primary transition-colors hover:text-primary/80 font-medium",
          className
        )}
      >
        {children}
      </span>
      <UserHistoryDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        userName={userName}
      />
    </>
  );
}
