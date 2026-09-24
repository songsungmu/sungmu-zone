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

/** ToolCallLog에 순서대로 채워 넣기 위한 최소 정보. */
export interface ChatToolCall {
  id: string;
  name: string;
}

/** POST /api/chat 응답 — mcp_tool_use/mcp_tool_result를 파싱해 정리한 결과. */
export interface ChatAnalyzeResponse {
  toolCalls: ChatToolCall[];
  finalText: string;
  requirements: RequirementItem[];
  policies: PolicyItem[];
  conflicts: PolicyConflict[];
  exceptions: ExceptionItem[];
}

/**
 * POST /api/chat는 NDJSON(한 줄에 이벤트 하나)을 스트리밍한다 — 분석 한 번이
 * 수십 초 걸릴 수 있어, 다 모아서 한 번에 응답하면 호스팅 플랫폼의 서버리스
 * 함수 타임아웃에 걸리기 때문이다. 도구가 호출/완료될 때마다 즉시 한 줄씩
 * 보내고, 마지막에 결과를 담은 한 줄을 보낸다.
 */
export type ChatStreamEvent =
  | { type: "tool_call"; id: string; name: string }
  | { type: "tool_done"; id: string }
  | ({ type: "result" } & ChatAnalyzeResponse)
  | { type: "error"; message: string };
