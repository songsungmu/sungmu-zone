import { FileText, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemSource } from "@/types/planner";

interface SourceIndicatorProps {
  source: ItemSource;
  className?: string;
}

export function SourceIndicator({ source, className }: SourceIndicatorProps) {
  const isDocument = source === "document";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-normal",
        isDocument ? "text-blue-600" : "text-slate-400",
        className
      )}
    >
      {isDocument ? <FileText className="size-3" /> : <Sparkles className="size-3" />}
      {isDocument ? "문서 근거" : "AI 추론"}
    </span>
  );
}
