import { Table2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Phase 5에서 승인된 항목이 실제 Google Sheet 정책 문서에 반영되는 뷰로 채워진다. */
export function GoogleSheetPanel() {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm font-semibold">
          Google Sheet 정책 문서
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-1 overflow-auto py-4 text-center">
        <Table2 className="size-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Phase 5에서 승인된 항목이 이 시트에 반영됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
