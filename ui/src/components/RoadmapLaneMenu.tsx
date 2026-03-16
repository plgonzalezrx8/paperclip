import type { Goal } from "@paperclipai/shared";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildRoadmapLanePatch,
  getRoadmapLane,
  getRoadmapLaneLabel,
  ROADMAP_LANES,
  type RoadmapLaneId,
} from "../lib/roadmap";
import { cn } from "../lib/utils";

interface RoadmapLaneMenuProps {
  goal: Pick<Goal, "planningHorizon" | "status">;
  disabled?: boolean;
  onMove: (patch: ReturnType<typeof buildRoadmapLanePatch>) => void;
  triggerLabel?: string;
  align?: "start" | "center" | "end";
  compact?: boolean;
}

export function RoadmapLaneMenu({
  goal,
  disabled = false,
  onMove,
  triggerLabel,
  align = "end",
  compact = false,
}: RoadmapLaneMenuProps) {
  const currentLane = getRoadmapLane(goal);
  const label = triggerLabel ?? getRoadmapLaneLabel(currentLane);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size={compact ? "xs" : "sm"}
          className={cn(
            "normal-case tracking-normal font-medium",
            compact ? "h-7 px-2 text-[11px]" : "text-xs"
          )}
          style={{
            fontFamily: "var(--font-body)",
            letterSpacing: "0.01em",
            textTransform: "none",
          }}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        {ROADMAP_LANES.map((lane) => (
          <DropdownMenuItem
            key={lane.id}
            disabled={lane.id === currentLane}
            onSelect={() => {
              onMove(buildRoadmapLanePatch(goal, lane.id as RoadmapLaneId));
            }}
          >
            <span className="flex flex-1 items-center justify-between gap-3">
              <span>{lane.title}</span>
              {lane.id === currentLane ? (
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              ) : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
