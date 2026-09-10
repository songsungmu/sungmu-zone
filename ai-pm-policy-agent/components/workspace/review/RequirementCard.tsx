import { Frame, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { RequirementItem } from "@/types/review";

interface RequirementCardProps {
  requirement: RequirementItem;
}

export function RequirementCard({ requirement }: RequirementCardProps) {
  const hasSource = Boolean(requirement.sourceFrame);

  return (
    <Card className="py-0">
      <CardContent className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {requirement.id}
            </span>
            <span className="text-sm font-semibold">{requirement.title}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {requirement.description}
          </p>
        </div>

        <span
          className={
            hasSource
              ? "flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium text-primary"
              : "flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          }
          title={requirement.sourceFrame}
        >
          {hasSource ? (
            <Frame className="size-3" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {hasSource ? "Figma 근거" : "추론"}
        </span>
      </CardContent>
    </Card>
  );
}
