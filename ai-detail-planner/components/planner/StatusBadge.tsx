import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlannerItemStatus } from "@/types/planner";

interface StatusBadgeProps {
  status: PlannerItemStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isConfirmed = status === "confirmed";

  return (
    <Badge
      className={cn(
        "border-transparent font-medium",
        isConfirmed
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-slate-100 text-slate-600 hover:bg-slate-100",
        className
      )}
    >
      {isConfirmed ? "Confirmed" : "AI 제안"}
    </Badge>
  );
}
