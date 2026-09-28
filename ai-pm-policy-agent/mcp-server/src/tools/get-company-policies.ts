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
        "Google Sheet에 저장된 기존 회사 정책을 읽기 전용으로 조회한다. 이 도구는 시트를 절대 수정하지 않으며, 쓰기 권한 자체를 갖고 있지 않다. 시트에 접근할 수 없으면 에러 대신 빈 목록과 note를 반환하니, 호출자는 policies가 비어 있으면 note를 확인하고 existingPolicies: []로 analyze_policies를 계속 진행하면 된다.",
      outputSchema: {
        policies: z.array(policyRecordSchema),
        note: z.string().nullable(),
      },
    },
    async () => {
      // Sheet 연결이 끊겨도(권한 없음/시트 삭제 등) 분석 전체가 멈추지
      // 않도록, 여기서 에러를 삼키고 빈 목록 + 안내 note로 저하시킨다.
      // 이렇게 하면 analyze_policies가 existingPolicies=[]로 호출되어
      // 모든 정책이 suggested로 분류된다(우아한 degrade).
      try {
        const policies = await fetchCompanyPolicies();
        const result = { policies, note: null };
        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const result = {
          policies: [],
          note: `정책 시트를 읽을 수 없어 기존 정책 없이 진행합니다: ${message}`,
        };
        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }
    }
  );
}
