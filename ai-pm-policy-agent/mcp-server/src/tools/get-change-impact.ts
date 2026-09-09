import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetChangeImpactTool(server: McpServer) {
  server.registerTool(
    "get_change_impact",
    {
      title: "정책 변경 영향도 분석 (스텁)",
      description:
        "정책 변경이 다른 화면/기능에 미치는 영향을 분석한다. 현재는 스텁이며 Phase 10에서 완성된다.",
      inputSchema: {
        policyId: z.string(),
      },
      outputSchema: {
        policyId: z.string(),
        status: z.literal("not_implemented"),
        message: z.string(),
      },
    },
    async ({ policyId }) => {
      const result = {
        policyId,
        status: "not_implemented" as const,
        message: "이 기능은 아직 구현되지 않았습니다. Phase 10에서 완성될 예정입니다.",
      };
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
