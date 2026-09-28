import * as React from "react";

import { cn } from "@/lib/utils";

/** 워크스페이스의 모든 영역이 공유하는 틀 — 흰 배경, 헤어라인 테두리, 그림자 없음. */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-card",
        className
      )}
      {...props}
    />
  );
}

interface PanelHeaderProps {
  title: React.ReactNode;
  /** 제목 오른쪽 — 상태 표시나 보조 액션. */
  aside?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ title, aside, className }: PanelHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-3 border-b px-5",
        className
      )}
    >
      <h2 className="min-w-0 truncate text-[13px] font-semibold">{title}</h2>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </header>
  );
}

/** 점 + 텍스트로 된 조용한 상태 표시. */
export function StatusDot({
  tone,
  children,
}: {
  tone: "idle" | "active" | "success" | "error";
  children: React.ReactNode;
}) {
  const dotClassName = {
    idle: "bg-muted-foreground/40",
    active: "bg-primary animate-pulse",
    success: "bg-status-confirmed-foreground",
    error: "bg-destructive",
  }[tone];

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dotClassName)} />
      {children}
    </span>
  );
}
