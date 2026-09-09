import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  policyAnalysisItemSchema,
  policyConflictSchema,
  policyRecordSchema,
  requirementItemSchema,
} from "../lib/schemas.js";

function extractKeywords(text: string): string[] {
  return Array.from(new Set(text.match(/[가-힣a-zA-Z0-9]{2,}/g) ?? []));
}

function overlaps(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  return a.some((word) => setB.has(word));
}

function extractNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

type PolicyAnalysisItem = z.infer<typeof policyAnalysisItemSchema>;
type PolicyConflict = z.infer<typeof policyConflictSchema>;

export function registerAnalyzePoliciesTool(server: McpServer) {
  server.registerTool(
    "analyze_policies",
    {
      title: "정책 분류 및 충돌 탐지",
      description:
        "요구사항과 기존 정책을 비교해 confirmed/suggested/need_decision으로 분류하고, 기존 정책과 상충하는 항목은 conflicts로 함께 반환한다.",
      inputSchema: {
        requirements: z.array(requirementItemSchema),
        existingPolicies: z.array(policyRecordSchema),
      },
      outputSchema: {
        policies: z.array(policyAnalysisItemSchema),
        conflicts: z.array(policyConflictSchema),
      },
    },
    async ({ requirements, existingPolicies }) => {
      const policies: PolicyAnalysisItem[] = [];
      const conflicts: PolicyConflict[] = [];

      for (const requirement of requirements) {
        const reqKeywords = extractKeywords(
          `${requirement.title} ${requirement.description}`
        );
        const relatedExisting = existingPolicies.find((policy) =>
          overlaps(
            reqKeywords,
            extractKeywords(`${policy.policyName} ${policy.content}`)
          )
        );

        const newPolicyId = `PL-${String(policies.length + 1).padStart(2, "0")}`;
        const suggestedContent = `"${requirement.title}" 요구사항을 지원하기 위한 정책이 필요합니다: ${requirement.description}`;

        if (relatedExisting) {
          const existingNumber = extractNumber(relatedExisting.content);
          const requirementNumber = extractNumber(requirement.description);
          const hasNumberConflict =
            existingNumber !== null &&
            requirementNumber !== null &&
            existingNumber !== requirementNumber;

          if (hasNumberConflict) {
            policies.push({
              id: newPolicyId,
              policyName: `${requirement.title} 관련 정책 (검토 필요)`,
              content: suggestedContent,
              classification: "need_decision",
              sourceType: "inferred",
              sourceRef: requirement.id,
              rationale: `기존 정책("${relatedExisting.policyName}")과 기준값이 달라 결정이 필요합니다.`,
            });
            conflicts.push({
              existingPolicyRef: relatedExisting.id,
              newPolicyId,
              description: `"${relatedExisting.policyName}" 기존 정책과 "${requirement.title}" 요구사항에서 도출된 신규 정책의 기준값이 다릅니다.`,
            });
            continue;
          }

          policies.push({
            id: newPolicyId,
            policyName: relatedExisting.policyName,
            content: relatedExisting.content,
            classification: "confirmed",
            sourceType: "existing",
            sourceRef: relatedExisting.id,
            rationale: "기존 정책 시트에서 이미 확인된 항목입니다.",
          });
          continue;
        }

        policies.push({
          id: newPolicyId,
          policyName: `${requirement.title} 관련 정책 (제안)`,
          content: suggestedContent,
          classification: "suggested",
          sourceType: "inferred",
          sourceRef: requirement.id,
          rationale: `"${requirement.title}" 요구사항에서 추론된 정책 후보입니다.`,
        });
      }

      const result = { policies, conflicts };
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
