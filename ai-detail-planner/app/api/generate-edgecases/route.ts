import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { extractJson } from "@/lib/ai-json";
import type { EdgeCase, Policy, Requirement } from "@/types/planner";

export const runtime = "nodejs";

interface GenerateEdgeCasesBody {
  requirements: Requirement[];
  policies: Policy[];
}

const SYSTEM_PROMPT_TEMPLATE = `당신은 15년차 시니어 프로덕트 매니저이자 QA 리드입니다.
아래 확정된 요구사항과 세부 정책을 바탕으로, 실제 운영 시 발생할 수 있는
예외 상황과 그 처리 방식을 도출하세요.

[확정된 상세 요구사항] {{requirementsJson}}
[확정된 세부 정책] {{policiesJson}}

지침:
- 다음 카테고리를 반드시 검토하세요: 기술적 실패(네트워크/인식 오류),
  정책 위반 시도(중복/한도초과), 사용자 실수, 부분 처리(부분 취소/환불),
  타이밍 이슈(기간 초과/동시성)
- 각 예외는 "예외 상황 → 처리 방식" 형태로 명확하게
- PM이 놓치기 쉬운 엣지 케이스를 우선적으로 포함하세요
- 반드시 아래 JSON 스키마로만 응답하세요.

{ "edgeCases": [ { "id": "EC-01", "situation": "예외 상황", "handling": "처리 방식", "status": "ai_suggested" } ] }`;

function buildSystemPrompt(body: GenerateEdgeCasesBody): string {
  return SYSTEM_PROMPT_TEMPLATE.replace(
    "{{requirementsJson}}",
    JSON.stringify(body.requirements)
  ).replace("{{policiesJson}}", JSON.stringify(body.policies));
}

function isValidRequirement(item: unknown): item is Requirement {
  if (typeof item !== "object" || item === null) return false;
  const { id, title, description, type } = item as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof title === "string" &&
    typeof description === "string" &&
    typeof type === "string"
  );
}

function isValidPolicy(item: unknown): item is Policy {
  if (typeof item !== "object" || item === null) return false;
  const { id, policyName, content, rationale } = item as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof policyName === "string" &&
    typeof content === "string" &&
    typeof rationale === "string"
  );
}

function parseEdgeCases(data: unknown): EdgeCase[] | null {
  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as { edgeCases?: unknown }).edgeCases)
  ) {
    return null;
  }

  const rawItems = (data as { edgeCases: unknown[] }).edgeCases;
  const edgeCases: EdgeCase[] = [];

  for (const item of rawItems) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const { id, situation, handling } = item as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      typeof situation !== "string" ||
      typeof handling !== "string"
    ) {
      return null;
    }
    edgeCases.push({ id, situation, handling, status: "ai_suggested" });
  }

  return edgeCases.length > 0 ? edgeCases : null;
}

export async function POST(request: Request) {
  let body: Partial<GenerateEdgeCasesBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { requirements, policies } = body;
  if (
    !Array.isArray(requirements) ||
    requirements.length === 0 ||
    !requirements.every(isValidRequirement) ||
    !Array.isArray(policies) ||
    policies.length === 0 ||
    !policies.every(isValidPolicy)
  ) {
    return NextResponse.json(
      { error: "requirements와 policies는 비어있지 않은 배열이어야 합니다." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버에 ANTHROPIC_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt({ requirements, policies }),
      messages: [
        {
          role: "user",
          content: "위 지침에 따라 예외처리 케이스를 JSON으로 생성해줘.",
        },
      ],
    });

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (!textBlock) {
      throw new Error("AI 응답에 텍스트 블록이 없습니다.");
    }
    responseText = textBlock.text;
  } catch (error) {
    console.error("[generate-edgecases] Anthropic API 호출 실패:", error);
    return NextResponse.json(
      { error: "AI 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJson(responseText);
  } catch (error) {
    console.error("[generate-edgecases] JSON 파싱 실패:", error, "\n원본 응답:", responseText);
    return NextResponse.json(
      { error: "AI 응답을 JSON으로 해석하지 못했습니다." },
      { status: 500 }
    );
  }

  const edgeCases = parseEdgeCases(parsed);
  if (!edgeCases) {
    console.error("[generate-edgecases] 스키마 검증 실패:", parsed);
    return NextResponse.json(
      { error: "AI 응답이 예상된 형식과 일치하지 않습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ edgeCases });
}
