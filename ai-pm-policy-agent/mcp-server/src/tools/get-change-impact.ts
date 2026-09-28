import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getSupabaseClient } from "../lib/supabase.js";

interface TraceLinkRow {
  project_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
}

const impactRefSchema = z.object({ id: z.string(), label: z.string() });

/**
 * 정책 변경 영향도 분석. Phase 6에서는 스텁이었고, Phase 10에서 Next.js
 * 앱이 분석마다 Supabase에 적재하는 trace_links를 실제로 조회하도록
 * 완성했다. policyId는 Google Sheet의 실제 Policy ID(POL-XXX)를
 * 가리킨다 — 이미 시트에 반영된 정책을 건드렸을 때 어떤 요구사항/정책/
 * 예외처리가 함께 영향받는지 프로젝트 전체 범위에서 찾는다.
 *
 * 이 도구는 읽기 전용이다 — trace_links/requirements/policies/exceptions
 * 어디에도 쓰지 않는다.
 */
export function registerGetChangeImpactTool(server: McpServer) {
  server.registerTool(
    "get_change_impact",
    {
      title: "정책 변경 영향도 분석",
      description:
        "Google Sheet의 실제 Policy ID(POL-XXX)를 받아, 그 정책과 연결된 요구사항/정책/예외처리를 trace_links에서 조회해 반환한다.",
      inputSchema: {
        policyId: z.string(),
      },
      outputSchema: {
        policyId: z.string(),
        affectedRequirements: z.array(impactRefSchema),
        affectedPolicies: z.array(impactRefSchema),
        affectedExceptions: z.array(impactRefSchema),
        note: z.string().nullable(),
      },
    },
    async ({ policyId }) => {
      const client = getSupabaseClient();
      if (!client) {
        const result = {
          policyId,
          affectedRequirements: [],
          affectedPolicies: [],
          affectedExceptions: [],
          note: "Supabase가 설정되지 않아 영향도를 조회할 수 없습니다.",
        };
        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      const { data: links, error } = await client
        .from("trace_links")
        .select("project_id, source_type, source_id, target_type, target_id")
        .or(
          `and(source_type.eq.sheet_policy,source_id.eq.${policyId}),and(target_type.eq.sheet_policy,target_id.eq.${policyId})`
        )
        .returns<TraceLinkRow[]>();

      if (error) {
        const result = {
          policyId,
          affectedRequirements: [],
          affectedPolicies: [],
          affectedExceptions: [],
          note: `trace_links 조회 실패: ${error.message}`,
        };
        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      const affectedRequirements: { id: string; label: string }[] = [];
      const affectedPolicies: { id: string; label: string }[] = [];
      const affectedExceptions: { id: string; label: string }[] = [];

      for (const link of links ?? []) {
        const isSource = link.source_type === "sheet_policy" && link.source_id === policyId;
        const otherType = isSource ? link.target_type : link.source_type;
        const otherId = isSource ? link.target_id : link.source_id;

        if (otherType === "requirement") {
          const { data } = await client
            .from("requirements")
            .select("analysis_id, title")
            .eq("project_id", link.project_id)
            .eq("analysis_id", otherId)
            .maybeSingle();
          if (data) affectedRequirements.push({ id: data.analysis_id, label: data.title });
        } else if (otherType === "policy") {
          const { data } = await client
            .from("policies")
            .select("analysis_id, title")
            .eq("project_id", link.project_id)
            .eq("analysis_id", otherId)
            .maybeSingle();
          if (data) affectedPolicies.push({ id: data.analysis_id, label: data.title });
        } else if (otherType === "exception") {
          const { data } = await client
            .from("exceptions")
            .select("analysis_id, situation")
            .eq("project_id", link.project_id)
            .eq("analysis_id", otherId)
            .maybeSingle();
          if (data) affectedExceptions.push({ id: data.analysis_id, label: data.situation });
        }
      }

      const result = {
        policyId,
        affectedRequirements,
        affectedPolicies,
        affectedExceptions,
        note: null,
      };
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
