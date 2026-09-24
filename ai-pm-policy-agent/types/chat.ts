import type {
  ExceptionItem,
  PolicyConflict,
  PolicyItem,
  RequirementItem,
} from "@/types/review";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** POST /api/chat의 최종 분석 결과 shape — "result" 스트림 이벤트에 그대로 실려 온다. */
export interface ChatAnalyzeResponse {
  finalText: string;
  requirements: RequirementItem[];
  policies: PolicyItem[];
  conflicts: PolicyConflict[];
  exceptions: ExceptionItem[];
}

/**
 * POST /api/chat는 NDJSON(한 줄에 이벤트 하나)을 스트리밍한다 — 서버가 Figma/
 * 정책 시트 조회, 요구사항/정책/예외처리 분석 도구를 순서대로 직접 호출하는
 * 동안 실시간으로 진행 상황(tool_call/tool_done)을 보내고, 마지막에 결과를
 * 담은 한 줄(result)을 보낸다.
 */
export type ChatStreamEvent =
  | { type: "tool_call"; id: string; name: string }
  | { type: "tool_done"; id: string }
  | ({ type: "result" } & ChatAnalyzeResponse)
  | { type: "error"; message: string };
