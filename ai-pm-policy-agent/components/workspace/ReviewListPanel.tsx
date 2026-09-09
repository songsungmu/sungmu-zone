import { ClipboardList } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Phase 4에서 실제 리뷰 항목 리스트(상세 요구사항 · 세부 정책 · 예외처리 케이스)로 채워진다. */
export function ReviewListPanel() {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm font-semibold">리뷰 리스트</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 overflow-auto py-6 text-center">
        <ClipboardList className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          아직 분석된 항목이 없습니다.
        </p>
        <p className="text-xs text-muted-foreground">
          Phase 4에서 상세 요구사항 · 세부 정책 · 예외처리 케이스 리뷰
          리스트가 여기에 표시됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
