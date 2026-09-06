"use client";

import { Check, X } from "lucide-react";
import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { EdgeCaseColumn } from "@/components/planner/EdgeCaseColumn";
import { InputPanel } from "@/components/planner/InputPanel";
import { PolicyColumn } from "@/components/planner/PolicyColumn";
import { RequirementColumn } from "@/components/planner/RequirementColumn";
import { fileToBase64 } from "@/lib/fileToBase64";
import { cn } from "@/lib/utils";
import { initialPlannerState } from "@/lib/mock-planner-data";
import type {
  EdgeCase,
  Policy,
  PlannerLoadingStage,
  PlannerState,
  Requirement,
} from "@/types/planner";

interface AttachmentPayload {
  mimeType: string;
  base64Data: string;
  fileName: string;
}

interface GenerateRequirementsResponse {
  requirements?: Requirement[];
  error?: string;
}

interface GeneratePoliciesResponse {
  policies?: Policy[];
  error?: string;
}

interface GenerateEdgeCasesResponse {
  edgeCases?: EdgeCase[];
  error?: string;
}

type ColumnType = "requirements" | "policies" | "edgeCases";

interface RefineColumnRequest {
  columnType: ColumnType;
  existingItems: Requirement[] | Policy[] | EdgeCase[];
  userInput: string;
  requirements?: Requirement[];
  policies?: Policy[];
}

interface RefineColumnResponse<T> {
  items?: T[];
  error?: string;
}

const STEPS = [
  { key: "requirements", label: "상세 요구사항" },
  { key: "policies", label: "세부 정책" },
  { key: "edgeCases", label: "예외처리 케이스" },
] as const;

/** 서버가 비정상 응답(예: HTML 에러 페이지)을 반환해도 크래시 대신 사용자 메시지로 처리한다. */
async function parseJsonResponse<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error("서버 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}

export default function Home() {
  const [planner, setPlanner] = useState<PlannerState>(initialPlannerState);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefiningRequirements, setIsRefiningRequirements] = useState(false);
  const [isRefiningPolicies, setIsRefiningPolicies] = useState(false);
  const [isRefiningEdgeCases, setIsRefiningEdgeCases] = useState(false);
  const [failedStage, setFailedStage] = useState<ColumnType | null>(null);

  // 컬럼 가로 크기 수동 조절: 드래그하기 전에는 CSS로 3등분(null), 한 번
  // 드래그하면 그 컬럼만 px 고정폭으로 전환된다. 네이티브 CSS resize와 달리
  // 드래그 중 마우스가 스크롤 컨테이너 우측 끝에 가까워지면 자동으로 스크롤을
  // 밀어줘서, 화면 밖으로 계속 늘릴 수 있다.
  const [colWidths, setColWidths] = useState<
    [number | null, number | null, number | null]
  >([null, null, null]);
  const columnsRowRef = useRef<HTMLDivElement>(null);
  const columnRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ] as const;
  const resizeDragRef = useRef<{
    index: 0 | 1 | 2;
    startX: number;
    startWidth: number;
    startScrollLeft: number;
    lastClientX: number;
    rafId: number;
  } | null>(null);

  const MIN_COLUMN_WIDTH = 240;
  const AUTO_SCROLL_EDGE = 48;
  const AUTO_SCROLL_STEP = 16;

  // mousemove만으로는 마우스가 화면 끝에 멈춰있을 때(실제로 움직이지 않을 때)
  // 더 이상 이벤트가 발생하지 않아 자동 스크롤이 멈춘다. 매 프레임 실행되는
  // rAF 루프로 대신 처리해서, 마우스를 끝에 붙이고 가만히 있어도 계속
  // 스크롤되면서 컬럼이 늘어나도록 한다.
  function resizeTick() {
    const drag = resizeDragRef.current;
    if (!drag) return;

    const container = columnsRowRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (drag.lastClientX > rect.right - AUTO_SCROLL_EDGE) {
        container.scrollLeft += AUTO_SCROLL_STEP;
      } else if (drag.lastClientX < rect.left + AUTO_SCROLL_EDGE) {
        container.scrollLeft -= AUTO_SCROLL_STEP;
      }

      const scrollDelta = container.scrollLeft - drag.startScrollLeft;
      const newWidth = Math.max(
        MIN_COLUMN_WIDTH,
        drag.startWidth + (drag.lastClientX - drag.startX) + scrollDelta
      );
      setColWidths((prev) => {
        if (prev[drag.index] === newWidth) return prev;
        const next: [number | null, number | null, number | null] = [
          ...prev,
        ];
        next[drag.index] = newWidth;
        return next;
      });
    }

    drag.rafId = requestAnimationFrame(resizeTick);
  }

  function handleResizeMouseMove(e: globalThis.MouseEvent) {
    const drag = resizeDragRef.current;
    if (!drag) return;
    drag.lastClientX = e.clientX;
  }

  function handleResizeMouseUp() {
    if (resizeDragRef.current) {
      cancelAnimationFrame(resizeDragRef.current.rafId);
    }
    resizeDragRef.current = null;
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", handleResizeMouseUp);
  }

  function handleResizeMouseDown(index: 0 | 1 | 2) {
    return (e: ReactMouseEvent<HTMLDivElement>) => {
      const el = columnRefs[index].current;
      const container = columnsRowRef.current;
      if (!el || !container) return;
      e.preventDefault();
      resizeDragRef.current = {
        index,
        startX: e.clientX,
        startWidth: el.getBoundingClientRect().width,
        startScrollLeft: container.scrollLeft,
        lastClientX: e.clientX,
        rafId: requestAnimationFrame(resizeTick),
      };
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("mouseup", handleResizeMouseUp);
    };
  }

  // React state는 다음 렌더까지 갱신되지 않으므로, 같은 이벤트 루프 틱에서
  // 발생할 수 있는 중복 클릭/중복 호출을 막기 위해 즉시 반영되는 ref로 가드한다.
  const chainBusyRef = useRef(false);
  const refiningBusyRef = useRef<Record<ColumnType, boolean>>({
    requirements: false,
    policies: false,
    edgeCases: false,
  });

  const { loadingStage } = planner;
  const isGeneratingRequirements = loadingStage === "requirements";
  const isGeneratingPolicies = loadingStage === "policies";
  const isGeneratingEdgeCases = loadingStage === "edgeCases";
  const isChainRunning =
    isGeneratingRequirements || isGeneratingPolicies || isGeneratingEdgeCases;
  // 문서 첨부는 순수 부가 정보이므로 필수 텍스트 필드 검증에는 관여하지 않는다.
  const canGenerate = validateInput() === null;

  function updateInput(patch: Partial<PlannerState["input"]>) {
    setPlanner((prev) => ({ ...prev, input: { ...prev.input, ...patch } }));
  }

  function validateInput(): string | null {
    const { functionName, requirementDraft, target, goal } = planner.input;
    if (!functionName.trim() || !requirementDraft.trim()) {
      return "기능명과 요구사항 초안은 필수 입력값입니다.";
    }
    if (!target.trim() || !goal.trim()) {
      return "타겟과 목표도 입력해주세요.";
    }
    return null;
  }

  function failChain(stage: ColumnType, error: unknown, fallbackMessage: string) {
    setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    setFailedStage(stage);
    setPlanner((prev) => ({ ...prev, loadingStage: "idle" }));
  }

  async function handleGenerate() {
    const validationError = validateInput();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setFailedStage(null);
    setPlanner((prev) => ({ ...prev, loadingStage: "requirements" }));

    try {
      let attachmentPayload: AttachmentPayload[] = [];
      if (attachments.length > 0) {
        try {
          attachmentPayload = await Promise.all(attachments.map(fileToBase64));
        } catch (fileError) {
          throw new Error(
            fileError instanceof Error
              ? fileError.message
              : "첨부 파일을 읽는 중 오류가 발생했습니다."
          );
        }
      }

      const res = await fetch("/api/generate-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...planner.input, attachments: attachmentPayload }),
      });
      const data = await parseJsonResponse<GenerateRequirementsResponse>(res);

      if (!res.ok || !data.requirements) {
        throw new Error(data.error ?? "요청 처리 중 오류가 발생했습니다.");
      }

      setPlanner((prev) => ({ ...prev, requirements: data.requirements! }));
      await generatePolicies(data.requirements);
    } catch (error) {
      failChain("requirements", error, "알 수 없는 오류가 발생했습니다.");
    }
  }

  async function generatePolicies(requirements: Requirement[]) {
    setFailedStage(null);
    setPlanner((prev) => ({ ...prev, loadingStage: "policies" }));

    try {
      const res = await fetch("/api/generate-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirements,
          functionName: planner.input.functionName,
          goal: planner.input.goal,
          target: planner.input.target,
        }),
      });
      const data = await parseJsonResponse<GeneratePoliciesResponse>(res);

      if (!res.ok || !data.policies) {
        throw new Error(data.error ?? "세부 정책 생성 중 오류가 발생했습니다.");
      }

      setPlanner((prev) => ({ ...prev, policies: data.policies! }));
      await generateEdgeCases(requirements, data.policies);
    } catch (error) {
      failChain("policies", error, "알 수 없는 오류가 발생했습니다.");
    }
  }

  async function generateEdgeCases(requirements: Requirement[], policies: Policy[]) {
    setFailedStage(null);
    setPlanner((prev) => ({ ...prev, loadingStage: "edgeCases" }));

    try {
      const res = await fetch("/api/generate-edgecases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements, policies }),
      });
      const data = await parseJsonResponse<GenerateEdgeCasesResponse>(res);

      if (!res.ok || !data.edgeCases) {
        throw new Error(data.error ?? "예외처리 케이스 생성 중 오류가 발생했습니다.");
      }

      setPlanner((prev) => ({
        ...prev,
        edgeCases: data.edgeCases!,
        loadingStage: "done",
      }));
    } catch (error) {
      failChain("edgeCases", error, "알 수 없는 오류가 발생했습니다.");
    }
  }

  /**
   * 입력 패널의 기본 액션. 이전 실행이 특정 단계에서 실패했고 그 이전 단계
   * 데이터가 남아있다면, 처음부터 전부 재생성하지 않고 실패한 단계만 재시도한다.
   */
  async function handlePrimaryAction() {
    if (chainBusyRef.current) return;
    chainBusyRef.current = true;

    try {
      if (failedStage === "policies" && planner.requirements.length > 0) {
        setErrorMessage(null);
        await generatePolicies(planner.requirements);
      } else if (
        failedStage === "edgeCases" &&
        planner.requirements.length > 0 &&
        planner.policies.length > 0
      ) {
        setErrorMessage(null);
        await generateEdgeCases(planner.requirements, planner.policies);
      } else {
        await handleGenerate();
      }
    } finally {
      chainBusyRef.current = false;
    }
  }

  async function callRefineColumn<T>(payload: RefineColumnRequest): Promise<T[]> {
    const res = await fetch("/api/refine-column", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse<RefineColumnResponse<T>>(res);

    if (!res.ok || !data.items) {
      throw new Error(data.error ?? "추가 항목 생성 중 오류가 발생했습니다.");
    }
    return data.items;
  }

  async function addRequirement(text: string) {
    if (refiningBusyRef.current.requirements) return;
    refiningBusyRef.current.requirements = true;
    setIsRefiningRequirements(true);
    setErrorMessage(null);

    try {
      const newItems = await callRefineColumn<Requirement>({
        columnType: "requirements",
        existingItems: planner.requirements,
        userInput: text,
      });
      setPlanner((prev) => ({
        ...prev,
        requirements: [...prev.requirements, ...newItems],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      refiningBusyRef.current.requirements = false;
      setIsRefiningRequirements(false);
    }
  }

  async function addPolicy(text: string) {
    if (refiningBusyRef.current.policies) return;
    refiningBusyRef.current.policies = true;
    setIsRefiningPolicies(true);
    setErrorMessage(null);

    try {
      const newItems = await callRefineColumn<Policy>({
        columnType: "policies",
        existingItems: planner.policies,
        userInput: text,
        requirements: planner.requirements,
      });
      setPlanner((prev) => ({
        ...prev,
        policies: [...prev.policies, ...newItems],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      refiningBusyRef.current.policies = false;
      setIsRefiningPolicies(false);
    }
  }

  async function addEdgeCase(text: string) {
    if (refiningBusyRef.current.edgeCases) return;
    refiningBusyRef.current.edgeCases = true;
    setIsRefiningEdgeCases(true);
    setErrorMessage(null);

    try {
      const newItems = await callRefineColumn<EdgeCase>({
        columnType: "edgeCases",
        existingItems: planner.edgeCases,
        userInput: text,
        requirements: planner.requirements,
        policies: planner.policies,
      });
      setPlanner((prev) => ({
        ...prev,
        edgeCases: [...prev.edgeCases, ...newItems],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      refiningBusyRef.current.edgeCases = false;
      setIsRefiningEdgeCases(false);
    }
  }

  function toggleRequirementStatus(id: string) {
    setPlanner((prev) => ({
      ...prev,
      requirements: prev.requirements.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "confirmed" ? "ai_suggested" : "confirmed" }
          : item
      ),
    }));
  }

  function togglePolicyStatus(id: string) {
    setPlanner((prev) => ({
      ...prev,
      policies: prev.policies.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "confirmed" ? "ai_suggested" : "confirmed" }
          : item
      ),
    }));
  }

  function toggleEdgeCaseStatus(id: string) {
    setPlanner((prev) => ({
      ...prev,
      edgeCases: prev.edgeCases.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "confirmed" ? "ai_suggested" : "confirmed" }
          : item
      ),
    }));
  }

  return (
    <div className="flex flex-col bg-slate-50 lg:h-screen lg:flex-row">
      <InputPanel
        value={planner.input}
        onChange={updateInput}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onSubmit={handlePrimaryAction}
        submitting={isChainRunning}
        disabled={!canGenerate}
        label={
          failedStage === "policies"
            ? "세부 정책 생성 재시도"
            : failedStage === "edgeCases"
              ? "예외처리 케이스 생성 재시도"
              : "AI 상세기획 생성하기"
        }
      />

      <div className="flex flex-1 flex-col lg:overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-8 py-4">
          <h1 className="text-base font-semibold text-slate-900">
            AI 상세 정책 가이드 도우미
          </h1>
          <StepIndicator stage={loadingStage} failedStage={failedStage} />
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
          <div
            ref={columnsRowRef}
            className="flex flex-col gap-4 lg:h-full lg:flex-row lg:overflow-x-auto"
          >
            <div
              ref={columnRefs[0]}
              className="relative w-full shrink-0 lg:h-full lg:w-[calc(33.333%-0.667rem)] lg:min-w-[280px]"
              style={colWidths[0] != null ? { width: colWidths[0] } : undefined}
            >
              <RequirementColumn
                items={planner.requirements}
                onAdd={addRequirement}
                onToggleStatus={toggleRequirementStatus}
                isLoading={isGeneratingRequirements}
                isAdding={isRefiningRequirements}
              />
              <ColumnResizeHandle
                onMouseDown={handleResizeMouseDown(0)}
                label="1번 영역 가로 크기 조절"
              />
            </div>

            <div
              ref={columnRefs[1]}
              className="relative w-full shrink-0 lg:h-full lg:w-[calc(33.333%-0.667rem)] lg:min-w-[280px]"
              style={colWidths[1] != null ? { width: colWidths[1] } : undefined}
            >
              <PolicyColumn
                items={planner.policies}
                onAdd={addPolicy}
                onToggleStatus={togglePolicyStatus}
                isLoading={isGeneratingPolicies}
                isAdding={isRefiningPolicies}
              />
              <ColumnResizeHandle
                onMouseDown={handleResizeMouseDown(1)}
                label="2번 영역 가로 크기 조절"
              />
            </div>

            <div
              ref={columnRefs[2]}
              className="relative w-full shrink-0 lg:h-full lg:w-[calc(33.333%-0.667rem)] lg:min-w-[280px]"
              style={colWidths[2] != null ? { width: colWidths[2] } : undefined}
            >
              <EdgeCaseColumn
                items={planner.edgeCases}
                onAdd={addEdgeCase}
                onToggleStatus={toggleEdgeCaseStatus}
                isLoading={isGeneratingEdgeCases}
                isAdding={isRefiningEdgeCases}
              />
              <ColumnResizeHandle
                onMouseDown={handleResizeMouseDown(2)}
                label="3번 영역 가로 크기 조절"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ColumnResizeHandle({
  onMouseDown,
  label,
}: {
  onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
  label: string;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      className="absolute inset-y-0 -right-1 hidden w-2 cursor-ew-resize touch-none select-none lg:block"
    >
      <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-blue-300 active:bg-blue-400" />
    </div>
  );
}

function StepIndicator({
  stage,
  failedStage,
}: {
  stage: PlannerLoadingStage;
  failedStage: ColumnType | null;
}) {
  const isDone = stage === "done";
  const activeIndex = STEPS.findIndex((step) => step.key === stage);
  // 실패 후 idle로 돌아온 상태에서도, 실패 지점 이전 단계는 완료로 남겨두고
  // 실패한 단계 자체는 "재시도 대기"임을 별도로 표시한다.
  const failedIndex =
    stage === "idle" && failedStage ? STEPS.findIndex((step) => step.key === failedStage) : -1;

  return (
    <ol className="flex items-center gap-4 text-xs font-medium">
      {STEPS.map((step, index) => {
        const isFailed = failedIndex === index;
        const isCompleted = isDone || activeIndex > index || (failedIndex !== -1 && index < failedIndex);
        const isActive = !isDone && activeIndex === index;
        const isNextUp = stage === "idle" && failedIndex === -1 && index === 0;

        return (
          <li key={step.key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                isFailed
                  ? "bg-red-100 text-red-600"
                  : isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive || isNextUp
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-500"
              )}
            >
              {isCompleted ? <Check className="size-3" /> : index + 1}
            </span>
            <span
              className={cn(
                isFailed
                  ? "text-red-600"
                  : isCompleted
                    ? "text-emerald-600"
                    : isActive || isNextUp
                      ? "text-blue-600"
                      : "text-slate-500"
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
      {isDone && (
        <li className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
          완료
        </li>
      )}
    </ol>
  );
}
