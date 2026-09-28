"use client";

import { useEffect, useRef, useState } from "react";

import { ClaudePanel } from "@/components/workspace/ClaudePanel";
import { DocumentUploadPanel } from "@/components/workspace/DocumentUploadPanel";
import { GoogleSheetPanel } from "@/components/workspace/GoogleSheetPanel";
import { Header } from "@/components/workspace/Header";
import { DuplicateConfirmDialog } from "@/components/workspace/review/DuplicateConfirmDialog";
import { ReviewListPanel } from "@/components/workspace/review/ReviewListPanel";
import { createMockAnalysisResult } from "@/lib/mock-review-data";
import { initialDocumentUploadState } from "@/types/document";
import type {
  AnalysisResult,
  PolicyConflict,
  PolicyDecision,
  PolicyItem,
} from "@/types/review";
import { initialSheetConnectionState } from "@/types/sheet";

interface ApproveApiResponse {
  policyId?: string;
  needsConfirmation?: boolean;
  reason?: string;
  error?: string;
}

export default function WorkspacePage() {
  // 업로드된 화면설계서(PNG/PDF) 상태는 여기(상위)에서 관리한다 — 분석
  // 요청 시 이 값을 그대로 함께 전달해야 하므로 DocumentUploadPanel 내부에
  // 가두지 않는다. Figma 연동을 완전히 대체한다(Figma API rate limit
  // 문제로, 업로드 방식으로 전환).
  const [uploadedDoc, setUploadedDoc] = useState(initialDocumentUploadState);

  // Google Sheet 연결 상태도 같은 이유로 상위에서 관리한다.
  const [sheet, setSheet] = useState(initialSheetConnectionState);

  // ClaudePanel은 정책/요구사항/예외처리 데이터를 직접 들고 있지 않는다.
  // 분석이 끝나면 결과를 여기로 올려보내고, ReviewListPanel이 이 state를
  // 받아 렌더링한다. ReviewListPanel이 이 프로젝트의 핵심 화면이라, 처음
  // 진입했을 때도 바로 시연 가능하도록 일단 목업 결과로 초기화해둔다 —
  // 아래 effect가 Supabase에 저장된 최근 분석이 있으면 그걸로 덮어쓴다
  // (Phase 10, 새로고침해도 리뷰 리스트가 사라지지 않도록).
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(() =>
    createMockAnalysisResult()
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { result: AnalysisResult | null } | null) => {
        if (!cancelled && data?.result) {
          setAnalysisResult(data.result);
        }
      })
      .catch((error) => {
        console.warn("최근 분석 결과 복원 실패(목업 데이터 유지):", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 승인/반려/결정 요청이 진행 중인 정책 id 집합 — 중복 클릭 방지 및
  // PolicyCard의 "처리 중..." 표시에 쓴다.
  const [pendingPolicyIds, setPendingPolicyIds] = useState<Set<string>>(new Set());
  // checkDuplicateBeforeAppend가 true를 반환했을 때만 채워지는 확인 모달 상태.
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    policy: PolicyItem;
    reason: string;
  } | null>(null);

  // 아래 핸들러들은 Phase 9의 승인 REST 엔드포인트(app/api/policies/*)를
  // 호출한다. 이 경로는 Phase 7의 채팅/AI 경로(app/api/chat,
  // lib/mcp-response-mapping.ts)와 코드 레벨에서 완전히 분리되어 있다 —
  // 같은 함수를 호출하지 않고 Claude API도 전혀 부르지 않는다.

  // pendingPolicyIds(state)는 버튼 disabled 표시용이고, 실제 "이미 처리
  // 중인가" 판정은 이 ref로 한다 — state 갱신은 리렌더를 거쳐야 반영되므로
  // 아주 빠르게 두 번 클릭되면(자동화 클릭 등) 그 사이에 두 요청이 모두
  // 시작될 수 있다. ref는 동기적으로 즉시 갱신되어 그 틈을 없앤다.
  const pendingIdsRef = useRef<Set<string>>(new Set());

  async function withPending(id: string, fn: () => Promise<void>) {
    if (pendingIdsRef.current.has(id)) return;
    pendingIdsRef.current.add(id);
    setPendingPolicyIds((prev) => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      pendingIdsRef.current.delete(id);
      setPendingPolicyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function submitApprove(policy: PolicyItem, force = false) {
    const res = await fetch("/api/policies/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy, figmaFileUrl: uploadedDoc.fileName ?? "", force }),
    });
    const data = (await res.json().catch(() => ({}))) as ApproveApiResponse;

    if (!res.ok) {
      console.error("정책 승인 실패:", data.error);
      return;
    }

    if (data.needsConfirmation) {
      setDuplicateConfirm({
        policy,
        reason: data.reason ?? "이미 유사한 정책이 있습니다.",
      });
      return;
    }

    setAnalysisResult((prev) => ({
      ...prev,
      policies: prev.policies.map((p) =>
        p.id === policy.id
          ? { ...p, classification: "confirmed", approvalStatus: "approved" }
          : p
      ),
    }));
  }

  function handleApprove(policy: PolicyItem) {
    void withPending(policy.id, () => submitApprove(policy));
  }

  function handleConfirmDuplicate() {
    if (!duplicateConfirm) return;
    const { policy } = duplicateConfirm;
    setDuplicateConfirm(null);
    void withPending(policy.id, () => submitApprove(policy, true));
  }

  function handleCancelDuplicate() {
    setDuplicateConfirm(null);
  }

  function handleReject(policy: PolicyItem) {
    void withPending(policy.id, async () => {
      const res = await fetch("/api/policies/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: policy.id }),
      });
      if (!res.ok) {
        console.error("정책 반려 실패");
        return;
      }
      setAnalysisResult((prev) => ({
        ...prev,
        policies: prev.policies.map((p) =>
          p.id === policy.id ? { ...p, approvalStatus: "rejected" } : p
        ),
      }));
    });
  }

  function handleEdit(policy: PolicyItem, newContent: string) {
    const updatedPolicy = { ...policy, content: newContent };
    setAnalysisResult((prev) => ({
      ...prev,
      policies: prev.policies.map((p) => (p.id === policy.id ? updatedPolicy : p)),
    }));
    void withPending(policy.id, () => submitApprove(updatedPolicy));
  }

  function handleDecide(policy: PolicyItem, decision: PolicyDecision) {
    void withPending(policy.id, async () => {
      const res = await fetch("/api/policies/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: policy.id, selectedOption: decision }),
      });
      if (!res.ok) {
        console.error("결정 기록 실패");
        return;
      }

      if (decision === "apply_new") {
        await submitApprove(policy);
      } else {
        // 기존 정책 유지 — 시트에는 반영하지 않고 결정만 확정 처리한다.
        setAnalysisResult((prev) => ({
          ...prev,
          policies: prev.policies.map((p) =>
            p.id === policy.id ? { ...p, classification: "confirmed" } : p
          ),
        }));
      }
    });
  }

  function handleResolveConflict(
    conflict: PolicyConflict,
    resolution: PolicyDecision
  ) {
    void resolution;
    setAnalysisResult((prev) => ({
      ...prev,
      conflicts: prev.conflicts.filter((c) => c.id !== conflict.id),
    }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <Header />

      {/*
        각 카드 오른쪽 아래 모서리를 드래그하면 그 카드만 커지거나 작아진다
        (CSS resize). 다른 영역을 줄이는 대신, 카드가 커진 만큼 페이지 전체
        길이가 늘어나서 아래로 스크롤해 볼 수 있다 — 그래서 바깥 컨테이너에
        높이를 고정하지 않고 자연스러운 문서 흐름(block)으로 둔다.
      */}
      <div className="flex-1 space-y-4 p-4">
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <div className="h-64 min-h-40 resize-y overflow-auto rounded-xl">
            <DocumentUploadPanel value={uploadedDoc} onChange={setUploadedDoc} />
          </div>
          <div className="h-64 min-h-40 resize-y overflow-auto rounded-xl">
            <ClaudePanel
              document={uploadedDoc}
              onAnalysisComplete={setAnalysisResult}
            />
          </div>
        </div>

        {/* 중단 리뷰 리스트 — 화면에서 가장 큰 비중을 차지하도록 기본 높이를 크게 잡는다 */}
        <div className="h-[28rem] min-h-64 resize-y overflow-auto rounded-xl">
          <ReviewListPanel
            requirements={analysisResult.requirements}
            policies={analysisResult.policies}
            exceptions={analysisResult.exceptions}
            conflicts={analysisResult.conflicts}
            pendingPolicyIds={pendingPolicyIds}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
            onDecide={handleDecide}
            onResolveConflict={handleResolveConflict}
          />
        </div>

        {/* 하단 시트 연결 */}
        <div className="h-40 min-h-32 resize-y overflow-auto rounded-xl">
          <GoogleSheetPanel value={sheet} onChange={setSheet} />
        </div>
      </div>

      {duplicateConfirm && (
        <DuplicateConfirmDialog
          reason={duplicateConfirm.reason}
          onConfirm={handleConfirmDuplicate}
          onCancel={handleCancelDuplicate}
        />
      )}
    </div>
  );
}
