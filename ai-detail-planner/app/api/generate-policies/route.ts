import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { extractJson } from "@/lib/ai-json";
import { isValidPolicy, isValidRequirement } from "@/lib/planner-parsers";
import type { Policy, Requirement } from "@/types/planner";

export const runtime = "nodejs";

interface GeneratePoliciesBody {
  requirements: Requirement[];
  functionName: string;
  goal: string;
  target: string;
}

const SYSTEM_PROMPT_TEMPLATE = `당신은 15년차 시니어 프로덕트 매니저입니다.
아래는 이미 확정된 상세 요구사항입니다. 이 요구사항들을 실제로 구현하려면
반드시 정해져야 하는 세부 정책(숫자, 기간, 조건, 우선순위 등)을 도출하세요.

[확정된 상세 요구사항] {{requirementsJson}}
[상위 기획 컨텍스트] {{functionName}} / {{goal}} / {{target}}

지침:
- 요구사항 하나하나를 보면서 "이걸 구현하려면 어떤 값/조건이 정해져야 하는가"를
  질문하듯 도출하세요. 예: "적립"이라는 요구사항이 있다면 → 적립 가능 기간,
  중복 적립 가능 여부, 적립 한도가 정책으로 필요함
- 정책마다 "근거"를 반드시 남기세요 (왜 이 값을 제안했는지)
- 반드시 아래 JSON 스키마로만 응답하세요.

{ "policies": [ { "id": "PL-01", "policyName": "정책 항목명", "content": "정책 내용", "status": "ai_suggested", "rationale": "근거" } ] }`;

function buildSystemPrompt(body: GeneratePoliciesBody): string {
  return SYSTEM_PROMPT_TEMPLATE.replace(
    "{{requirementsJson}}",
    JSON.stringify(body.requirements)
  )
    .replace("{{functionName}}", body.functionName)
    .replace("{{goal}}", body.goal)
    .replace("{{target}}", body.target);
}

function parsePolicies(data: unknown): Policy[] | null {
  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as { policies?: unknown }).policies)
  ) {
    return null;
  }

  const rawItems = (data as { policies: unknown[] }).policies;
  if (!rawItems.every(isValidPolicy)) {
    return null;
  }

  // 이 라우트는 첨부 문서를 받지 않으므로 모든 항목은 AI 추론으로 표시한다.
  const policies = rawItems.map((item) => ({
    ...item,
    status: "ai_suggested" as const,
    source: "inferred" as const,
  }));
  return policies.length > 0 ? policies : null;
}

export async function POST(request: Request) {
  let body: Partial<GeneratePoliciesBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { requirements, functionName, goal, target } = body;
  if (
    !Array.isArray(requirements) ||
    requirements.length === 0 ||
    !requirements.every(isValidRequirement) ||
    !functionName ||
    !goal ||
    !target
  ) {
    return NextResponse.json(
      { error: "requirements(비어있지 않은 배열), functionName, goal, target은 필수 입력값입니다." },
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
      system: buildSystemPrompt({ requirements, functionName, goal, target }),
      messages: [
        {
          role: "user",
          content: "위 지침에 따라 세부 정책을 JSON으로 생성해줘.",
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
    console.error("[generate-policies] Anthropic API 호출 실패:", error);
    return NextResponse.json(
      { error: "AI 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJson(responseText);
  } catch (error) {
    console.error("[generate-policies] JSON 파싱 실패:", error, "\n원본 응답:", responseText);
    return NextResponse.json(
      { error: "AI 응답을 JSON으로 해석하지 못했습니다." },
      { status: 500 }
    );
  }

  const policies = parsePolicies(parsed);
  if (!policies) {
    console.error("[generate-policies] 스키마 검증 실패:", parsed);
    return NextResponse.json(
      { error: "AI 응답이 예상된 형식과 일치하지 않습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ policies });
}
