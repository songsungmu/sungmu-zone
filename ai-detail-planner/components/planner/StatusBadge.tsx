import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlannerItemStatus } from "@/types/planner";

interface StatusBadgeProps {
  status: PlannerItemStatus;
  className?: string;
  onToggle?: () => void;
}

export function StatusBadge({ status, className, onToggle }: StatusBadgeProps) {
  const isConfirmed = status === "confirmed";

  const badge = (
    <Badge
      className={cn(
        "border-transparent font-medium transition-colors",
        isConfirmed
          ? cn("bg-emerald-100 text-emerald-700", onToggle && "group-hover:bg-emerald-200")
          : cn("bg-slate-100 text-slate-600", onToggle && "group-hover:bg-slate-200"),
        className
      )}
    >
      {isConfirmed ? "Confirmed" : "AI 제안"}
    </Badge>
  );

  if (!onToggle) {
    return badge;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="group cursor-pointer select-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={
        isConfirmed ? "Confirmed 상태를 AI 제안으로 변경" : "AI 제안 상태를 Confirmed로 변경"
      }
    >
      {badge}
    </button>
  );
}
