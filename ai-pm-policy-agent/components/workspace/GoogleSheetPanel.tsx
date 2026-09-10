"use client";

import { useState } from "react";
import { CheckCircle2, Sheet as SheetIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MOCK_SERVICE_ACCOUNT_EMAIL,
  type SheetConnectionState,
} from "@/types/sheet";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * 목업 연결 판별 — 실제 Google Sheets API 연동 전까지, 입력한 URL 문자열로
 * 성공/실패 케이스를 데모할 수 있게 한다. "noaccess" 포함 시 권한 없음,
 * "notfound" 포함 시 시트 없음, 그 외에는 정책 38건으로 성공 처리한다.
 */
function mockConnect(
  sheetUrl: string
): Pick<SheetConnectionState, "status" | "policyCount" | "errorReason"> {
  if (sheetUrl.includes("noaccess")) {
    return { status: "error", policyCount: null, errorReason: "no_permission" };
  }
  if (sheetUrl.includes("notfound")) {
    return { status: "error", policyCount: null, errorReason: "not_found" };
  }
  return { status: "connected", policyCount: 38, errorReason: null };
}

const STATUS_BADGE: Record<
  SheetConnectionState["status"],
  { label: string; dotClassName: string }
> = {
  disconnected: { label: "연결 안 됨", dotClassName: "bg-muted-foreground" },
  connecting: { label: "연결 중", dotClassName: "bg-status-suggested-foreground" },
  connected: { label: "연결됨", dotClassName: "bg-status-confirmed-foreground" },
  error: { label: "연결 실패", dotClassName: "bg-status-conflict-foreground" },
};

const ERROR_MESSAGE: Record<
  NonNullable<SheetConnectionState["errorReason"]>,
  string
> = {
  no_permission:
    "권한이 없습니다. 위 서비스 계정 이메일을 시트 편집자로 초대한 뒤 다시 시도해주세요.",
  not_found: "시트를 찾을 수 없습니다. Sheet ID/URL을 다시 확인해주세요.",
};

interface GoogleSheetPanelProps {
  value: SheetConnectionState;
  onChange: (next: SheetConnectionState) => void;
}

export function GoogleSheetPanel({ value, onChange }: GoogleSheetPanelProps) {
  const [draftUrl, setDraftUrl] = useState(value.sheetUrl);

  async function handleConnect() {
    const trimmed = draftUrl.trim();
    if (!trimmed) return;

    onChange({ ...value, sheetUrl: trimmed, status: "connecting" });
    await wait(600);
    onChange({ sheetUrl: trimmed, ...mockConnect(trimmed) });
  }

  function handleReset() {
    onChange({
      sheetUrl: draftUrl,
      status: "disconnected",
      policyCount: null,
      errorReason: null,
    });
  }

  const badge = STATUS_BADGE[value.status];

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <SheetIcon className="size-4 text-muted-foreground" />
          Google Sheet 정책 저장소 연결
        </CardTitle>
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className={`size-1.5 rounded-full ${badge.dotClassName}`} />
          {badge.label}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center gap-2 overflow-auto py-3">
        {value.status === "connected" ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-foreground">
              <CheckCircle2 className="size-3.5 text-status-confirmed-foreground" />
              기존 정책 {value.policyCount}건 불러옴 · 편집 권한 확인됨
            </p>
            <Button size="sm" variant="outline" className="h-8" onClick={handleReset}>
              다시 연결
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Sheet ID 또는 URL"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleConnect()}
                disabled={value.status === "connecting"}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                className="h-8 shrink-0"
                onClick={() => void handleConnect()}
                disabled={value.status === "connecting" || !draftUrl.trim()}
              >
                {value.status === "connecting" ? "연결 중..." : "연결"}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              서비스 계정{" "}
              <span className="font-mono text-foreground">
                {MOCK_SERVICE_ACCOUNT_EMAIL}
              </span>
              을 시트 편집자로 초대해주세요.
            </p>

            {value.status === "error" && value.errorReason && (
              <p className="text-xs text-destructive">
                {ERROR_MESSAGE[value.errorReason]}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
