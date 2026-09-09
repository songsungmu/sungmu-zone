"use client";

import { useState } from "react";

import { ClaudePanel } from "@/components/workspace/ClaudePanel";
import { FigmaPanel } from "@/components/workspace/FigmaPanel";
import { GoogleSheetPanel } from "@/components/workspace/GoogleSheetPanel";
import { Header } from "@/components/workspace/Header";
import { ReviewListPanel } from "@/components/workspace/review/ReviewListPanel";
import { createMockAnalysisResult } from "@/lib/mock-review-data";
import { initialFigmaConnectionState } from "@/types/figma";
import type {
  AnalysisResult,
  PolicyConflict,
  PolicyDecision,
  PolicyItem,
} from "@/types/review";
import { initialSheetConnectionState } from "@/types/sheet";

export default function WorkspacePage() {
  // Figma 연결 상태는 여기(상위)에서 관리한다 — Phase 7의 분석 요청 시
  // 이 값을 그대로 함께 전달해야 하므로 FigmaPanel 내부에 가두지 않는다.
  const [figma, setFigma] = useState(initialFigmaConnectionState);

  // Google Sheet 연결 상태도 같은 이유로 상위에서 관리한다.
  const [sheet, setSheet] = useState(initialSheetConnectionState);

  // ClaudePanel은 정책/요구사항/예외처리 데이터를 직접 들고 있지 않는다.
  // 분석이 끝나면 결과를 여기로 올려보내고, ReviewListPanel이 이 state를
  // 받아 렌더링한다. ReviewListPanel이 이 프로젝트의 핵심 화면이라, 처음
  // 진입했을 때도 바로 시연 가능하도록 목업 결과로 초기화해둔다.
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(() =>
    createMockAnalysisResult()
  );

  // 아래 핸들러들은 전부 로컬 state만 바꾼다. 실제 Google Sheet 반영은
  // CLAUDE.md 규칙대로 Phase 9의 별도 승인 REST 엔드포인트에서만 처리하며,
  // 이 화면(및 AI 도구 호출 경로)과는 절대 직접 연결하지 않는다.

  function handleApprove(policy: PolicyItem) {
    setAnalysisResult((prev) => ({
      ...prev,
      policies: prev.policies.map((p) =>
        p.id === policy.id ? { ...p, classification: "confirmed" } : p
      ),
    }));
  }

  function handleReject(policy: PolicyItem) {
    setAnalysisResult((prev) => ({
      ...prev,
      policies: prev.policies.filter((p) => p.id !== policy.id),
    }));
  }

  function handleEdit(policy: PolicyItem, newContent: string) {
    setAnalysisResult((prev) => ({
      ...prev,
      policies: prev.policies.map((p) =>
        p.id === policy.id ? { ...p, content: newContent } : p
      ),
    }));
  }

  function handleDecide(policy: PolicyItem, decision: PolicyDecision) {
    // 어느 쪽을 선택하든 결정이 내려진 것이므로 need_decision에서 벗어난다.
    void decision;
    setAnalysisResult((prev) => ({
      ...prev,
      policies: prev.policies.map((p) =>
        p.id === policy.id ? { ...p, classification: "confirmed" } : p
      ),
    }));
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
    <div className="flex h-screen flex-col bg-secondary/40">
      <Header />

      {/*
        grid-rows에 fr 단위를 쓰면 gap/padding을 제외한 나머지 공간을
        정확히 28:52:20 비율로 나눠준다 (flex-basis 퍼센트는 gap만큼
        컨테이너 밖으로 넘쳐서 페이지 스크롤이 생기는 문제가 있었음).
      */}
      <div className="grid min-h-0 flex-1 grid-rows-[28fr_52fr_20fr] gap-4 p-4">
        {/* 상단 2단 그리드 — 컴팩트하게, 전체 콘텐츠 영역의 28% */}
        <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
          <FigmaPanel value={figma} onChange={setFigma} />
          <ClaudePanel onAnalysisComplete={setAnalysisResult} />
        </div>

        {/* 중단 리뷰 리스트 — 화면에서 가장 큰 비중, 52% */}
        <div className="min-h-0">
          <ReviewListPanel
            requirements={analysisResult.requirements}
            policies={analysisResult.policies}
            exceptions={analysisResult.exceptions}
            conflicts={analysisResult.conflicts}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
            onDecide={handleDecide}
            onResolveConflict={handleResolveConflict}
          />
        </div>

        {/* 하단 시트 연결 — 20% */}
        <div className="min-h-0">
          <GoogleSheetPanel value={sheet} onChange={setSheet} />
        </div>
      </div>
    </div>
  );
}
