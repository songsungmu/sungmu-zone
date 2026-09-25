"use client";

import { useRef } from "react";
import { FileText, Image as ImageIcon, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DocumentUploadState } from "@/types/document";

interface DocumentUploadPanelProps {
  value: DocumentUploadState;
  onChange: (next: DocumentUploadState) => void;
}

// Claude API 요청 한도(base64 32MB)보다 여유 있게 원본 파일 크기를 제한한다.
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/png;base64,AAAA..." 에서 순수 base64 부분만 뗀다.
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DocumentUploadPanel({ value, onChange }: DocumentUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;

    if (file.type !== "image/png" && file.type !== "application/pdf") {
      onChange({
        ...value,
        status: "idle",
        error: "PNG 이미지 또는 PDF 파일만 업로드할 수 있습니다.",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      onChange({
        ...value,
        status: "idle",
        error: "파일이 너무 큽니다. 20MB 이하 파일을 업로드해주세요.",
      });
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);
      onChange({
        fileName: file.name,
        mediaType: file.type as "image/png" | "application/pdf",
        base64,
        status: "uploaded",
        error: null,
      });
    } catch {
      onChange({
        ...value,
        status: "idle",
        error: "파일을 읽는 중 오류가 발생했습니다. 다시 시도해주세요.",
      });
    }
  }

  function handleReset() {
    if (inputRef.current) inputRef.current.value = "";
    onChange({ fileName: null, mediaType: null, base64: null, status: "idle", error: null });
  }

  if (value.status === "uploaded" && value.base64) {
    return (
      <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span className="flex min-w-0 items-center gap-2">
              {value.mediaType === "application/pdf" ? (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{value.fileName}</span>
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
            >
              연결 해제
            </button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 items-center justify-center overflow-hidden py-2">
          {value.mediaType === "image/png" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:${value.mediaType};base64,${value.base64}`}
              alt={value.fileName ?? "업로드된 화면설계서"}
              className="max-h-full max-w-full rounded-md border object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="size-10" />
              <p className="text-xs">PDF 파일이 업로드되었습니다. 각 페이지를 화면 하나로 분석합니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Upload className="size-4 text-muted-foreground" />
          화면설계서 업로드
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 overflow-auto py-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,application/pdf"
          className="hidden"
          onChange={(e) => void handleFileSelected(e.target.files?.[0])}
        />
        <Button size="sm" className="h-8" onClick={() => inputRef.current?.click()}>
          PNG 또는 PDF 파일 선택
        </Button>
        <p className="text-[11px] text-muted-foreground">최대 20MB</p>
        {value.error && <p className="text-xs text-destructive">{value.error}</p>}
      </CardContent>
    </Card>
  );
}
