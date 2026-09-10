import { Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-8 py-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="size-5" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold">PM Agent</span>
          </div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            POLICY REVIEW CONSOLE
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full bg-status-confirmed-foreground" />
          인프라 정상 작동중
        </span>
        <Badge variant="outline">v0.1.0</Badge>
      </div>
    </header>
  );
}
