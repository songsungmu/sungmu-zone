import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  exceptionItemSchema,
  policyAnalysisItemSchema,
  requirementItemSchema,
} from "../lib/schemas.js";

const SYSTEM_KEYWORDS = ["업로드", "등록", "연동", "인식"];
const USER_KEYWORDS = ["입력", "작성", "제출"];

type ExceptionItem = z.infer<typeof exceptionItemSchema>;

export function registerAnalyzeExceptionsTool(server: McpServer) {
  server.registerTool(
    "analyze_exceptions",
    {
      title: "예외처리 케이스 도출",
      description:
        "요구사항과 정책을 바탕으로 시스템 오류/정책 위반/사용자 입력/경계값 예외처리 케이스를 구조화해서 반환한다.",
      inputSchema: {
        requirements: z.array(requirementItemSchema),
        policies: z.array(policyAnalysisItemSchema),
      },
      outputSchema: { exceptions: z.array(exceptionItemSchema) },
    },
    async ({ requirements, policies }) => {
      const exceptions: ExceptionItem[] = [];
      let counter = 0;
      const nextId = () => `EC-${String(++counter).padStart(2, "0")}`;

      for (const requirement of requirements) {
        if (
          SYSTEM_KEYWORDS.some((kw) => requirement.description.includes(kw))
        ) {
          exceptions.push({
            id: nextId(),
            situation: `"${requirement.title}" 처리 중 시스템 오류가 발생한 경우`,
            handling: "오류 메시지를 표시하고 사용자가 다시 시도할 수 있도록 안내한다.",
            category: "system",
            sourceRef: requirement.id,
          });
        }
        if (USER_KEYWORDS.some((kw) => requirement.description.includes(kw))) {
          exceptions.push({
            id: nextId(),
            situation: `"${requirement.title}" 단계에서 필수 입력이 누락된 경우`,
            handling: "제출을 막고 누락된 항목을 강조 표시한다.",
            category: "user",
            sourceRef: requirement.id,
          });
        }
      }

      for (const policy of policies) {
        if (policy.classification === "need_decision") {
          exceptions.push({
            id: nextId(),
            situation: `"${policy.policyName}" 정책 결정이 아직 내려지지 않은 상태에서 관련 케이스가 발생한 경우`,
            handling: "결정이 완료될 때까지 기존 정책 기준으로 보수적으로 처리한다.",
            category: "policy",
            sourceRef: policy.id,
          });
        }

        const numberMatch = policy.content.match(/\d+/);
        if (numberMatch) {
          exceptions.push({
            id: nextId(),
            situation: `"${policy.policyName}" 기준값(${numberMatch[0]})과 정확히 일치하는 경계 케이스`,
            handling: "기준값 포함 여부(이상/이하 등)를 명확히 정의해 일관되게 처리한다.",
            category: "boundary",
            sourceRef: policy.id,
          });
        }
      }

      const result = { exceptions };
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
