import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import type { Requirement } from "@/types/planner";

export const runtime = "nodejs";

interface GenerateRequirementsBody {
  functionName: string;
  requirementDraft: string;
  target: string;
  goal: string;
  referenceDocText: string;
}

const SYSTEM_PROMPT_TEMPLATE = `당신은 15년차 시니어 프로덕트 매니저입니다.
아래 상위 기획 정보를 바탕으로, 개발 가능한 수준의 상세 기능 요구사항을 도출하세요.

[기능명] {{functionName}}
[요구사항 초안] {{requirementDraft}}
[타겟 사용자] {{target}}
[목표] {{goal}}
[참고 문서] {{referenceDocText}}

지침:
- 요구사항은 사용자 행동 흐름 순서대로 나열하세요 (예: 등록 → 인식 → 검증 → 처리 → 확인)
- 각 요구사항은 "사용자는 ~할 수 있다" 또는 "시스템은 ~한다" 형식으로 작성
- 이 단계에서는 정책적 판단(숫자, 기간, 한도 등)은 넣지 말고 "기능"만 정의하세요
- 최소 4개, 최대 8개
- 반드시 아래 JSON 스키마로만 응답하세요. 다른 설명 텍스트는 절대 포함하지 마세요.

{ "requirements": [ { "id": "FR-01", "title": "짧은 제목", "description": "상세 설명", "type": "기능" } ] }`;

function buildSystemPrompt(body: GenerateRequirementsBody): string {
  return SYSTEM_PROMPT_TEMPLATE.replace("{{functionName}}", body.functionName)
    .replace("{{requirementDraft}}", body.requirementDraft)
    .replace("{{target}}", body.target)
    .replace("{{goal}}", body.goal)
    .replace("{{referenceDocText}}", body.referenceDocText || "(없음)");
}

/** Anthropic 응답에는 ```json 코드펜스나 설명 텍스트가 섞여 올 수 있어 방어적으로 JSON만 추출한다. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? candidate.slice(firstBrace, lastBrace + 1)
      : candidate;

  return JSON.parse(jsonSlice);
}

function parseRequirements(data: unknown): Requirement[] | null {
  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as { requirements?: unknown }).requirements)
  ) {
    return null;
  }

  const rawItems = (data as { requirements: unknown[] }).requirements;
  const requirements: Requirement[] = [];

  for (const item of rawItems) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const { id, title, description, type } = item as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof description !== "string" ||
      typeof type !== "string"
    ) {
      return null;
    }
    requirements.push({ id, title, description, type, status: "ai_suggested" });
  }

  return requirements.length > 0 ? requirements : null;
}

export async function POST(request: Request) {
  let body: Partial<GenerateRequirementsBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { functionName, requirementDraft, target, goal, referenceDocText } = body;
  if (!functionName || !requirementDraft || !target || !goal) {
    return NextResponse.json(
      { error: "기능명, 요구사항 초안, 타겟, 목표는 필수 입력값입니다." },
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
      system: buildSystemPrompt({
        functionName,
        requirementDraft,
        target,
        goal,
        referenceDocText: referenceDocText ?? "",
      }),
      messages: [
        {
          role: "user",
          content: "위 지침에 따라 상세 요구사항을 JSON으로 생성해줘.",
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
    console.error("[generate-requirements] Anthropic API 호출 실패:", error);
    return NextResponse.json(
      { error: "AI 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJson(responseText);
  } catch (error) {
    console.error("[generate-requirements] JSON 파싱 실패:", error, "\n원본 응답:", responseText);
    return NextResponse.json(
      { error: "AI 응답을 JSON으로 해석하지 못했습니다." },
      { status: 500 }
    );
  }

  const requirements = parseRequirements(parsed);
  if (!requirements) {
    console.error("[generate-requirements] 스키마 검증 실패:", parsed);
    return NextResponse.json(
      { error: "AI 응답이 예상된 형식과 일치하지 않습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ requirements });
}
