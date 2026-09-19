import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { figmaContextSchema, requirementItemSchema } from "../lib/schemas.js";

type RequirementItem = z.infer<typeof requirementItemSchema>;

export function registerAnalyzeRequirementsTool(server: McpServer) {
  server.registerTool(
    "analyze_requirements",
    {
      title: "요구사항 후보 도출",
      description:
        "Figma 프레임 목록과 프로젝트 설명을 규칙 기반으로 정리해 요구사항 후보를 구조화해서 반환한다. 최종 판단은 이 도구를 호출하는 대화(Claude)가 내린다.",
      inputSchema: {
        figmaContext: figmaContextSchema,
        projectContext: z.string().optional(),
      },
      outputSchema: { requirements: z.array(requirementItemSchema) },
    },
    async ({ figmaContext, projectContext }) => {
      const requirements: RequirementItem[] = figmaContext.frames.map((frame, index) => ({
        id: `FR-${String(index + 1).padStart(2, "0")}`,
        title: frame.name,
        description: `"${frame.name}" 화면에서 사용자가 수행할 수 있는 동작을 정의해야 합니다.`,
        sourceFrame: frame.name,
      }));

      const trimmedContext = projectContext?.trim();
      if (trimmedContext) {
        requirements.push({
          id: `FR-${String(requirements.length + 1).padStart(2, "0")}`,
          title: "추가 프로젝트 설명 기반 요구사항",
          description: trimmedContext,
          sourceFrame: null,
        });
      }

      const result = { requirements };
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
