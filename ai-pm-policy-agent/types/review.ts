export type ReviewItemStatus =
  | "confirmed"
  | "suggested"
  | "need-decision"
  | "conflict";

export interface ReviewItem {
  id: string;
  title: string;
  description: string;
  status: ReviewItemStatus;
}

/**
 * Claude 분석이 끝났을 때 ClaudePanel이 부모(workspace/page.tsx)로 올려보내는
 * 결과 뭉치. ClaudePanel은 이 데이터를 자기 안에 들고 있지 않고, 생성되는
 * 즉시 콜백으로 넘기고 손을 뗀다. Phase 4의 ReviewListPanel이 이 state를
 * 받아 실제 리스트로 렌더링한다.
 */
export interface AnalysisResult {
  requirements: ReviewItem[];
  policies: ReviewItem[];
  edgeCases: ReviewItem[];
  summary: string;
  generatedAt: string;
}
