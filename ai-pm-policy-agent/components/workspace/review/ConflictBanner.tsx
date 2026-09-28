import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PolicyConflict, PolicyDecision } from "@/types/review";

interface ConflictBannerProps {
  conflict: PolicyConflict;
  onResolve: (conflict: PolicyConflict, resolution: PolicyDecision) => void;
}

export function ConflictBanner({ conflict, onResolve }: ConflictBannerProps) {
  return (
    <div className="space-y-3 rounded-md border border-l-2 border-l-status-conflict-foreground px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium">{conflict.title}</p>
        <Badge variant="conflict">충돌</Badge>
      </div>

      <div className="grid gap-px overflow-hidden rounded-md border bg-border text-[13px] sm:grid-cols-2">
        <div className="bg-card px-3 py-2.5">
          <p className="mb-1 text-xs text-muted-foreground">기존 정책</p>
          <p className="leading-relaxed">{conflict.existingPolicy}</p>
        </div>
        <div className="bg-card px-3 py-2.5">
          <p className="mb-1 text-xs text-muted-foreground">신규 정책</p>
          <p className="leading-relaxed">{conflict.newPolicy}</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => onResolve(conflict, "keep_existing")}>
          기존 정책 유지
        </Button>
        <Button size="sm" onClick={() => onResolve(conflict, "apply_new")}>
          신규 정책 적용
        </Button>
      </div>
    </div>
  );
}
