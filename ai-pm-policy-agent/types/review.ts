export type PolicyClassification = "confirmed" | "suggested" | "need_decision";
export type ExceptionCategory = "system" | "policy" | "user" | "boundary";
export type PolicyDecision = "keep_existing" | "apply_new";

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
}

export interface ExceptionItem {
  id: string;
  situation: string;
  handling: string;
  category: ExceptionCategory;
}

export interface PolicyConflict {
  id: string;
  title: string;
  existingPolicy: string;
  newPolicy: string;
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
