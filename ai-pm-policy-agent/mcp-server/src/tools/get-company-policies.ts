import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchCompanyPolicies } from "../lib/sheets.js";
import { policyRecordSchema } from "../lib/schemas.js";

export function registerGetCompanyPoliciesTool(server: McpServer) {
  server.registerTool(
    "get_company_policies",
    {
      title: "회사 정책 시트 조회",
      description:
        "Google Sheet에 저장된 기존 회사 정책을 읽기 전용으로 조회한다. 이 도구는 시트를 절대 수정하지 않으며, 쓰기 권한 자체를 갖고 있지 않다.",
      outputSchema: { policies: z.array(policyRecordSchema) },
    },
    async () => {
      const policies = await fetchCompanyPolicies();
      const result = { policies };
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
