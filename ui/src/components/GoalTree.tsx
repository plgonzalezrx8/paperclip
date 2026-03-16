import type { Goal } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { type ReactNode, useState } from "react";
import { getGoalStatusLabel } from "../lib/roadmap";

interface GoalTreeProps {
  goals: Goal[];
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
  goalAction?: (goal: Goal) => ReactNode;
}

interface GoalNodeProps {
  goal: Goal;
  children: Goal[];
  allGoals: Goal[];
  depth: number;
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
  goalAction?: (goal: Goal) => ReactNode;
}

function GoalNode({
  goal,
  children,
  allGoals,
  depth,
  goalLink,
  onSelect,
  goalAction,
}: GoalNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const link = goalLink?.(goal);
  const guidancePreview = goal.guidance
    ? goal.guidance.replace(/[#*_`>-]/g, " ").replace(/\s+/g, " ").trim()
    : "";

  const inner = (
    <>
      {hasChildren ? (
        <button
          type="button"
          className="paperclip-icon-button rounded-full p-0.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
          />
        </button>
      ) : (
        <span className="w-4" />
      )}
      <span className="paperclip-work-meta capitalize">{goal.level}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{goal.title}</div>
        {guidancePreview && (
          <div className="truncate text-xs text-muted-foreground">
            {guidancePreview}
          </div>
        )}
      </div>
    </>
  );

  const classes = cn(
    "paperclip-work-row flex items-center gap-2 border-b border-[color:color-mix(in_oklab,var(--primary)_10%,var(--border))] px-3 py-2 text-sm transition-colors cursor-pointer last:border-b-0",
  );

  const action = goalAction?.(goal);

  function renderMainContent() {
    if (link) {
      return (
        <Link
          to={link}
          className="flex min-w-0 flex-1 items-center gap-2 no-underline text-inherit"
        >
          {inner}
        </Link>
      );
    }

    if (onSelect) {
      return (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(goal)}
        >
          {inner}
        </button>
      );
    }

    return <div className="flex min-w-0 flex-1 items-center gap-2">{inner}</div>;
  }

  return (
    <div>
      <div
        className={classes}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {renderMainContent()}
        {action ? (
          <div
            className="shrink-0"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {action}
          </div>
        ) : null}
        <StatusBadge
          status={goal.status}
          label={getGoalStatusLabel(goal.status)}
        />
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <GoalNode
              key={child.id}
              goal={child}
              children={allGoals.filter((g) => g.parentId === child.id)}
              allGoals={allGoals}
              depth={depth + 1}
              goalLink={goalLink}
              onSelect={onSelect}
              goalAction={goalAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalTree({ goals, goalLink, onSelect, goalAction }: GoalTreeProps) {
  const goalIds = new Set(goals.map((g) => g.id));
  const roots = goals.filter((g) => !g.parentId || !goalIds.has(g.parentId));

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">No roadmap items.</p>;
  }

  return (
    <div className="paperclip-work-list py-1">
      {roots.map((goal) => (
        <GoalNode
          key={goal.id}
          goal={goal}
          children={goals.filter((g) => g.parentId === goal.id)}
          allGoals={goals}
          depth={0}
          goalLink={goalLink}
          onSelect={onSelect}
          goalAction={goalAction}
        />
      ))}
    </div>
  );
}
