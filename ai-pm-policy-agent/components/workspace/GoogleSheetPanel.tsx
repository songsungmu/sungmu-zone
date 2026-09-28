"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader, StatusDot } from "@/components/workspace/Panel";
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

const STATUS_META: Record<
  SheetConnectionState["status"],
  { label: string; tone: "idle" | "active" | "success" | "error" }
> = {
  disconnected: { label: "연결 안 됨", tone: "idle" },
  connecting: { label: "연결 중", tone: "active" },
  connected: { label: "연결됨", tone: "success" },
  error: { label: "연결 실패", tone: "error" },
};

const ERROR_MESSAGE: Record<NonNullable<SheetConnectionState["errorReason"]>, string> = {
  no_permission:
    "권한이 없습니다. 아래 서비스 계정 이메일을 시트 편집자로 초대한 뒤 다시 시도해주세요.",
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
    onChange({ sheetUrl: draftUrl, status: "disconnected", policyCount: null, errorReason: null });
  }

  const status = STATUS_META[value.status];

  return (
    <Panel>
      <PanelHeader
        title="정책 시트"
        aside={<StatusDot tone={status.tone}>{status.label}</StatusDot>}
      />

      <div className="flex flex-1 flex-col justify-center gap-2 overflow-auto px-5 py-3">
        {value.status === "connected" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px]">
              기존 정책 <span className="font-medium">{value.policyCount}건</span>
              <span className="mx-2 text-border">|</span>
              <span className="text-muted-foreground">편집 권한 확인됨</span>
            </p>
            <Button size="sm" variant="ghost" onClick={handleReset}>
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
              />
              <Button
                className="shrink-0"
                onClick={() => void handleConnect()}
                disabled={value.status === "connecting" || !draftUrl.trim()}
              >
                {value.status === "connecting" ? "연결 중" : "연결"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              서비스 계정{" "}
              <span className="font-mono text-foreground/80">{MOCK_SERVICE_ACCOUNT_EMAIL}</span>
              을 시트 편집자로 초대해주세요.
            </p>

            {value.status === "error" && value.errorReason && (
              <p className="text-xs text-destructive">{ERROR_MESSAGE[value.errorReason]}</p>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
