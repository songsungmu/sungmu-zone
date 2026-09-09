import { Table2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PolicyItem } from "@/types/review";

/**
 * 읽기 전용 미러 뷰다 — 실제 Google Sheet 쓰기는 CLAUDE.md 규칙대로 여기서
 * 처리하지 않는다 (Phase 9의 별도 승인 REST 엔드포인트 몫). confirmed로
 * 분류된 정책만 "이미 시트에 반영된 것"으로 간주해 그대로 보여준다.
 */
interface GoogleSheetPanelProps {
  policies: PolicyItem[];
}

export function GoogleSheetPanel({ policies }: GoogleSheetPanelProps) {
  const confirmedPolicies = policies.filter(
    (p) => p.classification === "confirmed"
  );

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3">
        <CardTitle className="text-sm font-semibold">
          Google Sheet 정책 문서
        </CardTitle>
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className="size-1.5 rounded-full bg-status-confirmed-foreground" />
          {confirmedPolicies.length}건 반영됨
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {confirmedPolicies.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-4 text-center">
            <Table2 className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              아직 승인된 정책이 없습니다.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="w-20 px-4 py-1.5 font-medium">ID</th>
                <th className="w-40 px-4 py-1.5 font-medium">정책명</th>
                <th className="px-4 py-1.5 font-medium">내용</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {confirmedPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td className="px-4 py-1.5 font-mono text-muted-foreground">
                    {policy.id}
                  </td>
                  <td className="px-4 py-1.5 font-semibold whitespace-nowrap">
                    {policy.title}
                  </td>
                  <td className="px-4 py-1.5 text-muted-foreground">
                    {policy.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
