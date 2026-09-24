import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { callMcpTool } from "@/lib/core/mcpClient";
import { saveAnalysisResult } from "@/lib/core/supabase";
import type { ChatMessage } from "@/types/chat";
import type {
  ExceptionItem,
  PolicyConflict,
  PolicyItem,
  RequirementItem,
} from "@/types/review";

interface ChatRequestBody {
  messages: ChatMessage[];
  figmaFileUrl?: string;
}

// mcp-server가 반환하는 원시 shape (mcp-server/src/lib/schemas.ts와 대응).
interface FigmaFrame {
  id: string;
  name: string;
  type: string;
}
interface FigmaContext {
  fileName: string;
  frames: FigmaFrame[];
  summary: string;
}
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages가 필요합니다." }, { status: 400 });
  }

  const figmaFileUrl = body.figmaFileUrl?.trim();
  if (!figmaFileUrl) {
    return NextResponse.json(
      { error: "Figma 파일 URL이 연결되어 있지 않습니다." },
      { status: 400 }
    );
  }

  if (!process.env.MCP_SERVER_URL || !process.env.MCP_SERVER_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "MCP_SERVER_URL / MCP_SERVER_AUTH_TOKEN이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      let callCounter = 0;
      // 도구를 순서대로, 짧게 직접 호출한다 — 결과를 기다리는 동안 진행
      // 상황을 실시간 NDJSON 이벤트로 흘려보낸다(가짜 재생이 아니다).
      async function runTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
        const id = `tool-${++callCounter}`;
        send({ type: "tool_call", id, name });
        try {
          const result = await callMcpTool<T>(name, args);
          send({ type: "tool_done", id });
          return result;
        } catch (error) {
          send({ type: "tool_done", id });
          throw error;
        }
      }

      try {
        const figmaContext = await runTool<FigmaContext>("get_figma_context", {
          figmaFileUrl,
        });

        const { policies: existingPolicies } = await runTool<{
          policies: RawPolicyRecord[];
          note: string | null;
        }>("get_company_policies", {});

        const { requirements: rawRequirements } = await runTool<{
          requirements: RawRequirement[];
        }>("analyze_requirements", { figmaContext });

        const { policies: rawPolicies, conflicts: rawConflicts } = await runTool<{
          policies: RawPolicyAnalysisItem[];
          conflicts: RawPolicyConflict[];
        }>("analyze_policies", { requirements: rawRequirements, existingPolicies });

        const { exceptions } = await runTool<{ exceptions: ExceptionItem[] }>(
          "analyze_exceptions",
          { requirements: rawRequirements, policies: rawPolicies }
        );

        const requirements: RequirementItem[] = rawRequirements.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          sourceFrame: r.sourceFrame ?? undefined,
        }));

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
          existingPolicyRef: c.existingPolicyRef,
          newPolicyId: c.newPolicyId,
        }));

        const finalText = await summarize({
          requirements,
          policies,
          conflicts,
          exceptions,
        });

        // Phase 10: 새로고침해도 유지되도록 분석 결과를 저장한다. 실제로 뭔가
        // 분석됐을 때만 project 행을 만든다. 베스트에포트라 실패해도 이
        // 응답 자체는 그대로 반환한다.
        if (requirements.length > 0 || policies.length > 0) {
          await saveAnalysisResult({
            figmaFileUrl,
            requirements,
            policies,
            exceptions,
            conflicts,
          }).catch((error) => {
            console.warn("분석 결과 저장 중 오류(무시하고 계속):", error);
          });
        }

        send({ type: "result", finalText, requirements, policies, conflicts, exceptions });
      } catch (error) {
        console.error("분석 요청 처리 중 오류:", error);
        const message =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * 도구 호출은 전부 결정적 로직이라 이 요약 한 번만 Claude를 쓴다. 도구를
 * 전혀 안 주므로 빠르고(effort: low), 시간 예산에 거의 영향을 주지 않는다.
 */
async function summarize(data: {
  requirements: RequirementItem[];
  policies: PolicyItem[];
  conflicts: PolicyConflict[];
  exceptions: ExceptionItem[];
}): Promise<string> {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 512,
      output_config: { effort: "low" },
      system:
        "당신은 PM을 돕는 분석 에이전트입니다. 아래 분석 결과 개수를 보고 1~2문장으로만 한국어로 요약하세요. 다른 설명 없이 요약 문장만 답하세요.",
      messages: [
        {
          role: "user",
          content: `요구사항 ${data.requirements.length}개, 정책 ${data.policies.length}개(그 중 정책 충돌 ${data.conflicts.length}건), 예외처리 케이스 ${data.exceptions.length}개를 도출했습니다.`,
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text.trim() || "분석이 완료됐습니다.";
  } catch (error) {
    console.warn("요약 생성 중 오류(기본 문구로 대체):", error);
    return `요구사항 ${data.requirements.length}개, 정책 ${data.policies.length}개, 예외처리 케이스 ${data.exceptions.length}개를 도출했습니다.`;
  }
}
