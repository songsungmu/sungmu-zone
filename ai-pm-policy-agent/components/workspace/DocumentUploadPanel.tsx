"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/workspace/Panel";
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

function formatBytes(base64: string): string {
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function DocumentUploadPanel({ value, onChange }: DocumentUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;

    if (file.type !== "image/png" && file.type !== "application/pdf") {
      onChange({ ...value, error: "PNG 이미지 또는 PDF 파일만 업로드할 수 있습니다." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      onChange({ ...value, error: "파일이 너무 큽니다. 20MB 이하 파일을 업로드해주세요." });
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
      onChange({ ...value, error: "파일을 읽는 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  }

  function handleReset() {
    if (inputRef.current) inputRef.current.value = "";
    onChange({ fileName: null, mediaType: null, base64: null, status: "idle", error: null });
  }

  const isUploaded = value.status === "uploaded" && Boolean(value.base64);

  return (
    <Panel>
      <PanelHeader
        title="화면설계서"
        aside={
          isUploaded && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                교체
              </button>
              <span className="h-3 w-px bg-border" aria-hidden />
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                삭제
              </button>
            </>
          )
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/png,application/pdf"
        className="hidden"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
      />

      {isUploaded ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/60 p-4">
            {value.mediaType === "image/png" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:${value.mediaType};base64,${value.base64}`}
                alt={value.fileName ?? "업로드된 화면설계서"}
                className="max-h-full max-w-full rounded border bg-white object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <FileText className="size-8 text-muted-foreground/60" strokeWidth={1.25} />
                <p className="text-xs text-muted-foreground">
                  PDF는 페이지별로 나누어 분석합니다
                </p>
              </div>
            )}
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2 border-t px-5 text-xs">
            <span className="truncate font-medium">{value.fileName}</span>
            <span className="shrink-0 text-muted-foreground">
              {value.mediaType === "application/pdf" ? "PDF" : "PNG"} ·{" "}
              {formatBytes(value.base64 ?? "")}
            </span>
            {value.error && (
              <span className="ml-auto truncate text-destructive">{value.error}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              void handleFileSelected(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/[0.04]"
                : "border-input hover:border-muted-foreground/40 hover:bg-muted/50"
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full border bg-background">
              <Upload className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="space-y-1">
              <span className="block text-[13px] font-medium">
                파일을 끌어다 놓거나 클릭해서 업로드
              </span>
              <span className="block text-xs text-muted-foreground">
                PNG · PDF, 최대 20MB
              </span>
            </span>
          </button>
          {value.error && <p className="mt-2 text-xs text-destructive">{value.error}</p>}
        </div>
      )}
    </Panel>
  );
}
