"use client";

import { useState } from "react";
import { FileImage } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildFigmaEmbedUrl, parseFigmaUrl } from "@/lib/figma";
import type { FigmaConnectionState } from "@/types/figma";

interface FigmaPanelProps {
  value: FigmaConnectionState;
  onChange: (next: FigmaConnectionState) => void;
}

export function FigmaPanel({ value, onChange }: FigmaPanelProps) {
  const [draftUrl, setDraftUrl] = useState(value.url);

  function handleLoad() {
    const trimmed = draftUrl.trim();
    if (!trimmed) {
      onChange({
        ...value,
        status: "disconnected",
        error: "Figma 파일 URL을 입력해주세요.",
      });
      return;
    }

    const parsed = parseFigmaUrl(trimmed);
    if (!parsed) {
      onChange({
        ...value,
        status: "disconnected",
        error:
          "올바른 Figma 파일 URL이 아닙니다. figma.com/file, /design, /proto 형식의 URL을 입력해주세요.",
      });
      return;
    }

    onChange({
      url: trimmed,
      status: "connected",
      fileName: parsed.fileName,
      error: null,
    });
  }

  function handleDisconnect() {
    setDraftUrl("");
    onChange({ url: "", status: "disconnected", fileName: null, error: null });
  }

  if (value.status === "connected") {
    return (
      <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span className="flex min-w-0 items-center gap-2">
              <FileImage className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{value.fileName}</span>
            </span>
            <button
              type="button"
              onClick={handleDisconnect}
              className="shrink-0 text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
            >
              연결 해제
            </button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-1 overflow-hidden py-2">
          <iframe
            src={buildFigmaEmbedUrl(value.url)}
            className="min-h-0 w-full flex-1 rounded-md border"
            allowFullScreen
            title="Figma 화면설계서"
          />
          <p className="shrink-0 text-[11px] text-muted-foreground">
            비공개 파일이거나 접근 권한이 없으면 위 화면에 Figma 로그인/오류가
            표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileImage className="size-4 text-muted-foreground" />
          Figma 화면설계서
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center gap-2 overflow-auto py-3">
        <div className="flex gap-2">
          <Input
            placeholder="Figma 파일 URL"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 shrink-0" onClick={handleLoad}>
            불러오기
          </Button>
        </div>
        {value.error && <p className="text-xs text-destructive">{value.error}</p>}
      </CardContent>
    </Card>
  );
}
