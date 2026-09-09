import { Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// 목업 도구 호출 로그 — 실제 MCP 연동은 다음 Phase에서 연결된다.
const mockToolLog = [
  'get_figma_screen("영수증-사후적립_화면설계.fig")',
  'read_policy_sheet("적립 정책 v3")',
];

/**
 * 이 패널에는 정책 요약이나 승인 버튼을 절대 넣지 않는다.
 * 오직 연결 상태, 도구 호출 로그, 짧은 텍스트 응답, 메시지 입력창만 포함한다.
 * (정책 반영 로직은 이 패널과 완전히 분리된 별도 승인 플로우에서만 처리한다 — CLAUDE.md 참고)
 */
export function ClaudePanel() {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            Claude
          </span>
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="size-2 rounded-full bg-status-confirmed-foreground" />
            MCP 연결됨
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 overflow-auto py-3">
        <div className="space-y-1 rounded-md bg-muted px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {mockToolLog.map((line) => (
            <p key={line} className="truncate">
              → {line}
            </p>
          ))}
        </div>
        <p className="text-xs text-foreground">
          화면설계서와 정책 시트를 비교했습니다. 아래 리뷰 리스트에서
          확인해주세요. (목업 응답)
        </p>
      </CardContent>

      <div className="flex items-center gap-2 border-t p-3">
        <Input
          placeholder="메시지 입력 (다음 Phase에서 연결)"
          disabled
          className="h-8 text-xs"
        />
        <Button size="icon" className="size-8" disabled>
          <Send className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}
