import { useState } from "react";
import { cn } from "../lib/utils";
import { issueStatusIcon, issueStatusIconDefault } from "../lib/status-colors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const allStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled", "blocked"];

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusIconProps {
  status: string;
  onChange?: (status: string) => void;
  className?: string;
  showLabel?: boolean;
}

export function StatusIcon({ status, onChange, className, showLabel }: StatusIconProps) {
  const [open, setOpen] = useState(false);
  const colorClass = issueStatusIcon[status] ?? issueStatusIconDefault;

  const circle = (
    <span
      className={cn(
        "relative inline-flex size-4 rounded-full border-2 shrink-0 items-center justify-center",
        colorClass,
        onChange && !showLabel && "cursor-pointer",
        className
      )}
    >
      {/* Backlog: dashed appearance — use dotted border via ring trick */}
      {status === "backlog" && (
        <span className="absolute inset-0 rounded-full border border-dashed border-current opacity-50" />
      )}
      {/* In Progress: half-fill (left half solid) */}
      {status === "in_progress" && (
        <span className="absolute left-0 top-0 h-full w-1/2 rounded-l-full bg-current opacity-60" />
      )}
      {/* In Review: small diamond/dot rotated 45deg */}
      {status === "in_review" && (
        <span className="absolute inset-0 m-auto size-1.5 rotate-45 bg-current" />
      )}
      {/* Done: solid center dot */}
      {status === "done" && (
        <span className="absolute inset-0 m-auto size-2 rounded-full bg-current" />
      )}
      {/* Cancelled: diagonal line (strikethrough) */}
      {status === "cancelled" && (
        <span className="absolute inset-0 m-auto h-[1.5px] w-2.5 rotate-45 rounded-full bg-current" />
      )}
      {/* Blocked: small X shape */}
      {status === "blocked" && (
        <>
          <span className="absolute inset-0 m-auto h-[1.5px] w-2 rotate-45 rounded-full bg-current" />
          <span className="absolute inset-0 m-auto h-[1.5px] w-2 -rotate-45 rounded-full bg-current" />
        </>
      )}
      {/* Todo: empty circle — no inner shape needed */}
    </span>
  );

  if (!onChange) return showLabel ? <span className="inline-flex items-center gap-1.5">{circle}<span className="text-sm">{statusLabel(status)}</span></span> : circle;

  const trigger = showLabel ? (
    <button className="inline-flex items-center gap-1.5 cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 py-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background">
      {circle}
      <span className="text-sm">{statusLabel(status)}</span>
    </button>
  ) : circle;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {allStatuses.map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2 text-xs", s === status && "bg-accent")}
            onClick={() => {
              onChange(s);
              setOpen(false);
            }}
          >
            <StatusIcon status={s} />
            {statusLabel(s)}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
