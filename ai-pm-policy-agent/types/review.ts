export type PolicyClassification = "confirmed" | "suggested" | "need_decision";
export type ExceptionCategory = "system" | "policy" | "user" | "boundary";
export type PolicyDecision = "keep_existing" | "apply_new";

/**
 * ai_suggested: 이 분석 세션에서 AI가 새로 제안한 정책 — 승인 시 시트에
 *   새 행을 추가한다(appendPolicy).
 * company_sheet: 원래 정책 시트에 이미 있던 정책 — 승인해도 새 행을
 *   추가하지 않고 상태만 갱신한다(updatePolicyStatus).
 */
export type PolicySourceType = "ai_suggested" | "company_sheet";

/** Phase 9 승인/반려 결과 — 백엔드 classification과 별개인 프론트 전용 UI 상태. */
export type PolicyApprovalStatus = "approved" | "rejected";

export interface RequirementItem {
  id: string;
  title: string;
  description: string;
  /** 있으면 "Figma 근거" 배지, 없으면 "추론" 배지로 표시한다. */
  sourceFrame?: string;
}

export interface PolicyItem {
  id: string;
  title: string;
  content: string;
  classification: PolicyClassification;
  rationale?: string;
  sourceType?: PolicySourceType;
  /** ai_suggested면 근거가 된 RequirementItem.id, company_sheet면 시트의 실제 Policy ID(POL-XXX). */
  sourceRef?: string | null;
  approvalStatus?: PolicyApprovalStatus;
}

export interface ExceptionItem {
  id: string;
  situation: string;
  handling: string;
  category: ExceptionCategory;
  /** 이 예외를 발생시킨 RequirementItem.id 또는 PolicyItem.id — Phase 10 trace_links용. */
  sourceRef?: string | null;
}

export interface PolicyConflict {
  id: string;
  title: string;
  existingPolicy: string;
  newPolicy: string;
  /** 시트의 기존 정책 ID(POL-XXX) — Phase 10 trace_links용. */
  existingPolicyRef?: string;
  /** 이 세션에서 새로 도출된 정책의 PolicyItem.id — Phase 10 trace_links용. */
  newPolicyId?: string;
}

/**
 * Claude 분석이 끝났을 때 ClaudePanel이 부모(workspace/page.tsx)로 올려보내는
 * 결과 뭉치. ClaudePanel은 이 데이터를 자기 안에 들고 있지 않고, 생성되는
 * 즉시 콜백으로 넘기고 손을 뗀다. ReviewListPanel이 이 state를 받아 실제
 * 리스트로 렌더링한다.
 */
export interface AnalysisResult {
  requirements: RequirementItem[];
  policies: PolicyItem[];
  exceptions: ExceptionItem[];
  conflicts: PolicyConflict[];
  summary: string;
  generatedAt: string;
}
