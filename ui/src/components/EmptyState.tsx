import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="paperclip-empty-state">
      <div className="paperclip-empty-state-icon">
        <Icon className="size-9 text-muted-foreground" />
      </div>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">{message}</p>
      {description && (
        <p className="max-w-md text-xs leading-5 text-muted-foreground/70">{description}</p>
      )}
      {action && onAction && (
        <Button onClick={onAction}>
          <Plus className="size-4 mr-1.5" />
          {action}
        </Button>
      )}
    </div>
  );
}
