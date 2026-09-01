"use client";

import { useState } from "react";

import { EdgeCaseColumn } from "@/components/planner/EdgeCaseColumn";
import { InputPanel } from "@/components/planner/InputPanel";
import { PolicyColumn } from "@/components/planner/PolicyColumn";
import { RequirementColumn } from "@/components/planner/RequirementColumn";
import { cn } from "@/lib/utils";
import { initialPlannerState } from "@/lib/mock-planner-data";
import type { PlannerState } from "@/types/planner";

const STEPS = [
  { key: "requirements", label: "상세 요구사항" },
  { key: "policies", label: "세부 정책" },
  { key: "edgeCases", label: "예외처리 케이스" },
] as const;

export default function Home() {
  const [planner, setPlanner] = useState<PlannerState>(initialPlannerState);

  function updateInput(patch: Partial<PlannerState["input"]>) {
    setPlanner((prev) => ({ ...prev, input: { ...prev.input, ...patch } }));
  }

  function handleGenerate() {
    // AI 연동은 이후 Phase에서 구현. 지금은 화면 스켈레톤만 완성.
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
      <InputPanel value={planner.input} onChange={updateInput} onSubmit={handleGenerate} />

      <div className="flex flex-1 flex-col lg:overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-8 py-4">
          <h1 className="text-base font-semibold text-slate-900">
            AI 상세 정책 가이드 도우미
          </h1>
          <StepIndicator />
        </header>

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
