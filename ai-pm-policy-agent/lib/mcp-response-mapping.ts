import type Anthropic from "@anthropic-ai/sdk";

import type { ChatAnalyzeResponse, ChatToolCall } from "@/types/chat";
import type {
  ExceptionItem,
  PolicyConflict,
  PolicyItem,
  RequirementItem,
} from "@/types/review";

/**
 * mcp-server(mcp-server/src/tools/*)가 반환하는 원시 shape. 프론트가 이미
 * 쓰고 있는 types/review.ts shape와 필드명이 다르므로(policyName vs title,
 * ref 기반 conflicts 등) 이 파일에서 변환을 전담한다 — ReviewListPanel 쪽은
 * 손대지 않는다.
 */
interface RawPolicyRecord {
  id: string;
  policyName: string;
  content: string;
  category: string;
}

interface RawRequirement {
  id: string;
  title: string;
  description: string;
  sourceFrame: string | null;
}

interface RawPolicyAnalysisItem {
  id: string;
  policyName: string;
  content: string;
  classification: "confirmed" | "suggested" | "need_decision";
  sourceType: "existing" | "inferred";
  sourceRef: string | null;
  rationale: string;
}

interface RawPolicyConflict {
  existingPolicyRef: string;
  newPolicyId: string;
  description: string;
}

function parseToolResultContent(
  content: Anthropic.Beta.BetaMCPToolResultBlock["content"]
): unknown {
  const text =
    typeof content === "string" ? content : content.map((block) => block.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseMcpAnalysisResponse(
  content: Anthropic.Beta.BetaContentBlock[]
): ChatAnalyzeResponse {
  const toolCalls: ChatToolCall[] = [];
  const toolNameByUseId = new Map<string, string>();
  const resultByToolName = new Map<string, unknown>();
  const textParts: string[] = [];

  for (const block of content) {
    if (block.type === "mcp_tool_use") {
      toolCalls.push({ id: block.id, name: block.name });
      toolNameByUseId.set(block.id, block.name);
    } else if (block.type === "mcp_tool_result") {
      if (block.is_error) continue;
      const toolName = toolNameByUseId.get(block.tool_use_id);
      if (!toolName) continue;
      resultByToolName.set(toolName, parseToolResultContent(block.content));
    } else if (block.type === "text") {
      textParts.push(block.text);
    }
  }

  const existingPolicies =
    (resultByToolName.get("get_company_policies") as { policies?: RawPolicyRecord[] } | null)
      ?.policies ?? [];

  const rawRequirements =
    (resultByToolName.get("analyze_requirements") as
      | { requirements?: RawRequirement[] }
      | null)?.requirements ?? [];
  const requirements: RequirementItem[] = rawRequirements.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    sourceFrame: r.sourceFrame ?? undefined,
  }));

  const rawPolicyResult = resultByToolName.get("analyze_policies") as {
    policies?: RawPolicyAnalysisItem[];
    conflicts?: RawPolicyConflict[];
  } | null;
  const rawPolicies = rawPolicyResult?.policies ?? [];
  const rawConflicts = rawPolicyResult?.conflicts ?? [];

  const policies: PolicyItem[] = rawPolicies.map((p) => ({
    id: p.id,
    title: p.policyName,
    content: p.content,
    classification: p.classification,
    rationale: p.rationale,
    // Phase 9 승인 API가 append(신규 정책) vs update(기존 정책 상태 변경)를
    // 결정할 때 쓴다. existing -> company_sheet, inferred -> ai_suggested.
    sourceType: p.sourceType === "existing" ? "company_sheet" : "ai_suggested",
    sourceRef: p.sourceRef,
  }));

  const newPolicyContentById = new Map(rawPolicies.map((p) => [p.id, p.content]));
  const existingPolicyContentById = new Map(
    existingPolicies.map((p) => [p.id, p.content])
  );

  const conflicts: PolicyConflict[] = rawConflicts.map((c) => ({
    id: `${c.existingPolicyRef}-${c.newPolicyId}`,
    title: c.description,
    existingPolicy:
      existingPolicyContentById.get(c.existingPolicyRef) ??
      "(기존 정책 원문을 찾을 수 없습니다)",
    newPolicy:
      newPolicyContentById.get(c.newPolicyId) ?? "(신규 정책 원문을 찾을 수 없습니다)",
  }));

  const exceptions =
    (resultByToolName.get("analyze_exceptions") as { exceptions?: ExceptionItem[] } | null)
      ?.exceptions ?? [];

  return {
    toolCalls,
    finalText: textParts.join("\n\n").trim(),
    requirements,
    policies,
    conflicts,
    exceptions,
  };
}
