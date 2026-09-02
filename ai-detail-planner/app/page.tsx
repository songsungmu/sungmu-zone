"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { EdgeCaseColumn } from "@/components/planner/EdgeCaseColumn";
import { InputPanel } from "@/components/planner/InputPanel";
import { PolicyColumn } from "@/components/planner/PolicyColumn";
import { RequirementColumn } from "@/components/planner/RequirementColumn";
import { cn } from "@/lib/utils";
import { initialPlannerState } from "@/lib/mock-planner-data";
import type { PlannerState, Requirement } from "@/types/planner";

interface GenerateRequirementsResponse {
  requirements?: Requirement[];
  error?: string;
}

const STEPS = [
  { key: "requirements", label: "상세 요구사항" },
  { key: "policies", label: "세부 정책" },
  { key: "edgeCases", label: "예외처리 케이스" },
] as const;

export default function Home() {
  const [planner, setPlanner] = useState<PlannerState>(initialPlannerState);
  const [isGeneratingRequirements, setIsGeneratingRequirements] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateInput(patch: Partial<PlannerState["input"]>) {
    setPlanner((prev) => ({ ...prev, input: { ...prev.input, ...patch } }));
  }

  async function handleGenerate() {
    setIsGeneratingRequirements(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/generate-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planner.input),
      });
      const data: GenerateRequirementsResponse = await res.json();

      if (!res.ok || !data.requirements) {
        throw new Error(data.error ?? "요청 처리 중 오류가 발생했습니다.");
      }

      setPlanner((prev) => ({ ...prev, requirements: data.requirements! }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsGeneratingRequirements(false);
    }
  }

  function addRequirement(text: string) {
    setPlanner((prev) => ({
      ...prev,
      requirements: [
        ...prev.requirements,
        {
          id: `FR-${String(prev.requirements.length + 1).padStart(2, "0")}`,
          title: text,
          description: "",
          type: "추가",
          status: "ai_suggested",
        },
      ],
    }));
  }

  function addPolicy(text: string) {
    setPlanner((prev) => ({
      ...prev,
      policies: [
        ...prev.policies,
        {
          id: `PL-${String(prev.policies.length + 1).padStart(2, "0")}`,
          policyName: text,
          content: "",
          status: "ai_suggested",
          rationale: "추가 입력",
        },
      ],
    }));
  }

  function addEdgeCase(text: string) {
    setPlanner((prev) => ({
      ...prev,
      edgeCases: [
        ...prev.edgeCases,
        {
          id: `EC-${String(prev.edgeCases.length + 1).padStart(2, "0")}`,
          situation: text,
          handling: "",
          status: "ai_suggested",
        },
      ],
    }));
  }

  return (
    <div className="flex flex-col bg-slate-50 lg:h-screen lg:flex-row">
      <InputPanel
        value={planner.input}
        onChange={updateInput}
        onSubmit={handleGenerate}
        submitting={isGeneratingRequirements}
      />

      <div className="flex flex-1 flex-col lg:overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-8 py-4">
          <h1 className="text-base font-semibold text-slate-900">
            AI 상세 정책 가이드 도우미
          </h1>
          <StepIndicator />
        </header>

        {errorMessage && (
          <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-8 py-3 text-sm text-red-700">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="shrink-0 rounded p-1 hover:bg-red-100"
              aria-label="에러 메시지 닫기"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <main className="flex-1 p-6 lg:overflow-auto">
          <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-3">
            <RequirementColumn items={planner.requirements} onAdd={addRequirement} />
            <PolicyColumn items={planner.policies} onAdd={addPolicy} />
            <EdgeCaseColumn items={planner.edgeCases} onAdd={addEdgeCase} />
          </div>
        </main>
      </div>
    </div>
  );
}

function StepIndicator() {
  return (
    <ol className="flex items-center gap-4 text-xs font-medium">
      {STEPS.map((step, index) => {
        const isActive = index === 0;
        return (
          <li key={step.key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-500"
              )}
            >
              {index + 1}
            </span>
            <span className={cn(isActive ? "text-blue-600" : "text-slate-500")}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
