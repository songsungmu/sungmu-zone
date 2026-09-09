import { FileImage } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FigmaPanel() {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <FileImage className="size-4 text-muted-foreground" />
            Figma 화면설계서
          </span>
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="size-2 rounded-full bg-status-confirmed-foreground" />
            연결됨
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 items-center gap-3 overflow-auto py-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
          <FileImage className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            영수증-사후적립_화면설계.fig
          </p>
          <p className="truncate text-xs text-muted-foreground">
            목업 데이터 · 실제 연동은 다음 Phase에서
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
