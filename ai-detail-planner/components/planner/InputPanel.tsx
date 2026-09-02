"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlannerInput } from "@/types/planner";

interface InputPanelProps {
  value: PlannerInput;
  onChange: (patch: Partial<PlannerInput>) => void;
  onSubmit: () => void;
  submitting?: boolean;
  label?: string;
}

export function InputPanel({
  value,
  onChange,
  onSubmit,
  submitting = false,
  label = "AI 상세기획 생성하기",
}: InputPanelProps) {
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
      </div>

      <Button
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700"
        onClick={onSubmit}
        disabled={submitting}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
