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
