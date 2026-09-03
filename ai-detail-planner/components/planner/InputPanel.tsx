"use client";

import { FileText, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { type DragEvent, type ReactNode, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PlannerInput } from "@/types/planner";

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/png"]);

interface InputPanelProps {
  value: PlannerInput;
  onChange: (patch: Partial<PlannerInput>) => void;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  onSubmit: () => void;
  submitting?: boolean;
  disabled?: boolean;
  label?: string;
}

export function InputPanel({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  onSubmit,
  submitting = false,
  disabled = false,
  label = "AI 상세기획 생성하기",
}: InputPanelProps) {
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsLocked = submitting;
  const canAttachMore = !attachmentsLocked && attachments.length < MAX_ATTACHMENTS;

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    let nextError: string | null = null;
    const accepted: File[] = [];
    let remainingSlots = MAX_ATTACHMENTS - attachments.length;

    for (const file of incoming) {
      const isAllowedType =
        ALLOWED_ATTACHMENT_TYPES.has(file.type) || /\.(pdf|png)$/i.test(file.name);
      if (!isAllowedType) {
        nextError = `${file.name}: PDF 또는 PNG 파일만 첨부할 수 있습니다.`;
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        nextError = `${file.name}: 파일 크기는 10MB를 초과할 수 없습니다.`;
        continue;
      }
      if (remainingSlots <= 0) {
        nextError = `최대 ${MAX_ATTACHMENTS}개까지 첨부할 수 있습니다.`;
        break;
      }
      accepted.push(file);
      remainingSlots -= 1;
    }

    setAttachmentError(nextError);
    if (accepted.length > 0) {
      onAttachmentsChange([...attachments, ...accepted]);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (!canAttachMore) return;
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function removeAttachment(index: number) {
    setAttachmentError(null);
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-white px-6 py-6 lg:w-80 lg:border-r lg:border-b-0">
      <h2 className="mb-6 text-sm font-semibold text-slate-900">
        프로젝트 요구사항 초안 입력
      </h2>

      <div className="flex-1 space-y-5">
        <Field label="기능명">
          <Input
            placeholder="기능명 입력"
            value={value.functionName}
            onChange={(e) => onChange({ functionName: e.target.value })}
          />
        </Field>

        <Field label="요구사항 초안">
          <Textarea
            placeholder="요구사항 초안 입력"
            rows={5}
            value={value.requirementDraft}
            onChange={(e) => onChange({ requirementDraft: e.target.value })}
          />
        </Field>

        <Field label="타겟">
          <Input
            placeholder="타겟 입력"
            value={value.target}
            onChange={(e) => onChange({ target: e.target.value })}
          />
        </Field>

        <Field label="목표">
          <Input
            placeholder="프로젝트 목표 입력"
            value={value.goal}
            onChange={(e) => onChange({ goal: e.target.value })}
          />
        </Field>

        <Field label="참고 문서 (텍스트 붙여넣기)">
          <Textarea
            placeholder="문서 내용을 붙여넣어주세요"
            rows={4}
            value={value.referenceDocText}
            onChange={(e) => onChange({ referenceDocText: e.target.value })}
          />
        </Field>

        <Field label={`참고 문서 업로드 (PDF, PNG · 최대 ${MAX_ATTACHMENTS}개, 개당 10MB)`}>
          <div
            onClick={() => canAttachMore && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (canAttachMore) setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-4 text-center text-xs transition-colors",
              canAttachMore ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
            )}
          >
            <Upload className="size-4 text-slate-400" />
            <span className="text-slate-500">클릭하거나 파일을 끌어다 놓으세요</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
              disabled={!canAttachMore}
            />
          </div>

          {attachmentError && (
            <p className="mt-1.5 text-xs text-red-600">{attachmentError}</p>
          )}

          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded border bg-slate-50 px-2 py-1.5 text-xs"
                >
                  {file.type === "application/pdf" ? (
                    <FileText className="size-3.5 shrink-0 text-slate-400" />
                  ) : (
                    <ImageIcon className="size-3.5 shrink-0 text-slate-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-slate-700">{file.name}</span>
                  <span className="shrink-0 text-slate-400">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    disabled={attachmentsLocked}
                    className="shrink-0 rounded p-0.5 hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-50"
                    aria-label={`${file.name} 삭제`}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
      </div>

      <Button
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700"
        onClick={onSubmit}
        disabled={submitting || disabled}
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" />
            생성 중...
          </>
        ) : (
          label
        )}
      </Button>
    </aside>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
