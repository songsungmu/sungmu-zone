import { AlertOctagon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PolicyConflict, PolicyDecision } from "@/types/review";

interface ConflictBannerProps {
  conflict: PolicyConflict;
  onResolve: (conflict: PolicyConflict, resolution: PolicyDecision) => void;
}

export function ConflictBanner({ conflict, onResolve }: ConflictBannerProps) {
  return (
    <Card className="border-status-conflict bg-status-conflict/40 py-0">
      <CardContent className="space-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="size-4 shrink-0 text-status-conflict-foreground" />
          <span className="text-sm font-semibold text-status-conflict-foreground">
            정책 충돌 — {conflict.title}
          </span>
        </div>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-md border bg-card px-3 py-2">
            <p className="mb-0.5 font-medium text-muted-foreground">
              기존 정책
            </p>
            <p>{conflict.existingPolicy}</p>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <p className="mb-0.5 font-medium text-muted-foreground">
              신규 정책
            </p>
            <p>{conflict.newPolicy}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve(conflict, "keep_existing")}
          >
            기존 정책 유지
          </Button>
          <Button size="sm" onClick={() => onResolve(conflict, "apply_new")}>
            신규 정책 적용
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
