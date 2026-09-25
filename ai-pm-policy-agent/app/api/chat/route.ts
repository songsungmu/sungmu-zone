import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { extractRequirementsFromDocument, type RawRequirement } from "@/lib/core/documentAnalysis";
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
  fileName?: string;
  /** 단일 호출로 분석할 문서(PNG, 또는 짧은 PDF 전체). */
  document?: { mediaType: "image/png" | "application/pdf"; base64: string };
  /**
   * 페이지가 많은 PDF는 클라이언트가 미리 /api/chat/pdf-pages +
   * /api/chat/analyze-page로 페이지별로 나눠 분석한 뒤, 그 결과를 여기로
   * 보낸다 — 이 경우 이 라우트는 문서 분석 단계를 건너뛰고 바로 정책
   * 분류/예외처리 분석으로 넘어간다.
   */
  requirements?: RawRequirement[];
}

// mcp-server가 반환하는 원시 shape (mcp-server/src/lib/schemas.ts와 대응).
interface RawPolicyRecord {
  id: string;
  policyName: string;
  content: string;
  category: string;
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

/** FR-01, FR-02... 형식으로 다시 번호를 매긴다. 페이지별로 따로 분석된
 *  요구사항들은 페이지마다 FR-01부터 다시 시작해서 번호가 겹치므로,
 *  합친 뒤 여기서 한 번 더 순서대로 정리한다. */
function renumberRequirements(requirements: RawRequirement[]): RawRequirement[] {
  return requirements.map((r, index) => ({
    ...r,
    id: `FR-${String(index + 1).padStart(2, "0")}`,
  }));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages가 필요합니다." }, { status: 400 });
  }

  const doc = body.document;
  const providedRequirements = body.requirements;
  if ((!doc || !doc.base64 || !doc.mediaType) && !providedRequirements) {
    return NextResponse.json(
      { error: "화면설계서(PNG/PDF)가 업로드되어 있지 않습니다." },
      { status: 400 }
    );
  }

  if (!process.env.MCP_SERVER_URL || !process.env.MCP_SERVER_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "MCP_SERVER_URL / MCP_SERVER_AUTH_TOKEN이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const fileName = body.fileName ?? null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      let callCounter = 0;
      async function runStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const id = `tool-${++callCounter}`;
        send({ type: "tool_call", id, name });
        try {
          const result = await fn();
          send({ type: "tool_done", id });
          return result;
        } catch (error) {
          send({ type: "tool_done", id });
          throw error;
        }
      }

      try {
        const rawRequirements = providedRequirements
          ? renumberRequirements(providedRequirements)
          : await runStep("analyze_document", () => extractRequirementsFromDocument(doc!));

        const { policies: existingPolicies } = await runStep<{
          policies: RawPolicyRecord[];
          note: string | null;
        }>("get_company_policies", () => callMcpTool("get_company_policies", {}));

        const { policies: rawPolicies, conflicts: rawConflicts } = await runStep<{
          policies: RawPolicyAnalysisItem[];
          conflicts: RawPolicyConflict[];
        }>("analyze_policies", () =>
          callMcpTool("analyze_policies", { requirements: rawRequirements, existingPolicies })
        );

        const { exceptions } = await runStep<{ exceptions: ExceptionItem[] }>(
          "analyze_exceptions",
          () =>
            callMcpTool("analyze_exceptions", {
              requirements: rawRequirements,
              policies: rawPolicies,
            })
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
            // DB 컬럼명은 Figma 연동 시절 이름(figma_file_url) 그대로 쓴다 —
            // 이제는 업로드된 파일명을 담는 용도로 재사용한다(마이그레이션 불필요).
            figmaFileUrl: fileName,
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
