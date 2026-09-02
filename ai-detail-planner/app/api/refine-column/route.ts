import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { extractJson } from "@/lib/ai-json";
import { isValidEdgeCase, isValidPolicy, isValidRequirement } from "@/lib/planner-parsers";
import type { EdgeCase, Policy, Requirement } from "@/types/planner";

export const runtime = "nodejs";

type ColumnType = "requirements" | "policies" | "edgeCases";

interface RefineColumnBody {
  columnType: ColumnType;
  existingItems: unknown[];
  userInput: string;
  requirements?: Requirement[];
  policies?: Policy[];
}

const ITEM_KIND_LABEL: Record<ColumnType, string> = {
  requirements: "상세 요구사항",
  policies: "세부 정책",
  edgeCases: "예외처리 케이스",
};

const SCHEMA_EXAMPLE: Record<ColumnType, string> = {
  requirements:
    '{ "requirements": [ { "id": "FR-06", "title": "짧은 제목", "description": "상세 설명", "type": "기능" } ] }',
  policies:
    '{ "policies": [ { "id": "PL-06", "policyName": "정책 항목명", "content": "정책 내용", "status": "ai_suggested", "rationale": "근거" } ] }',
  edgeCases:
    '{ "edgeCases": [ { "id": "EC-06", "situation": "예외 상황", "handling": "처리 방식", "status": "ai_suggested" } ] }',
};

function buildContextSection(body: RefineColumnBody): string {
  const sections: string[] = [];
  if (body.columnType !== "requirements" && body.requirements) {
    sections.push(`[확정된 상세 요구사항] ${JSON.stringify(body.requirements)}`);
  }
  if (body.columnType === "edgeCases" && body.policies) {
    sections.push(`[확정된 세부 정책] ${JSON.stringify(body.policies)}`);
  }
  return sections.length > 0 ? `${sections.join("\n")}\n` : "";
}

function buildSystemPrompt(body: RefineColumnBody): string {
  const itemKind = ITEM_KIND_LABEL[body.columnType];

  return `아래는 현재까지 확정/제안된 ${itemKind} 리스트입니다.

${buildContextSection(body)}[기존 리스트] ${JSON.stringify(body.existingItems)}
[사용자 추가 입력] ${body.userInput}

사용자의 추가 입력을 반영하여, 기존 리스트에 없는 새로운 항목만 추가로 제안하세요.
기존 항목과 중복되거나 이미 커버되는 내용은 생성하지 마세요.
ID는 기존 리스트의 마지막 번호 다음부터 이어서 부여하세요 (예: 기존이 FR-05까지면
FR-06부터).

동일한 JSON 스키마로, 새로 추가된 항목만 응답하세요. (전체 리스트를 다시 보내지 말 것)

${SCHEMA_EXAMPLE[body.columnType]}`;
}

function isValidExistingItems(columnType: ColumnType, items: unknown[]): boolean {
  if (columnType === "requirements") return items.every(isValidRequirement);
  if (columnType === "policies") return items.every(isValidPolicy);
  return items.every(isValidEdgeCase);
}

function parseNewItems(
  columnType: ColumnType,
  data: unknown
): (Requirement | Policy | EdgeCase)[] | null {
  if (typeof data !== "object" || data === null) return null;
  const rawItems = (data as Record<string, unknown>)[columnType];
  if (!Array.isArray(rawItems)) return null;

  if (columnType === "requirements") {
    if (!rawItems.every(isValidRequirement)) return null;
    return rawItems.map((item) => ({ ...item, status: "ai_suggested" as const }));
  }
  if (columnType === "policies") {
    if (!rawItems.every(isValidPolicy)) return null;
    return rawItems.map((item) => ({ ...item, status: "ai_suggested" as const }));
  }
  if (!rawItems.every(isValidEdgeCase)) return null;
  return rawItems.map((item) => ({ ...item, status: "ai_suggested" as const }));
}

export async function POST(request: Request) {
  let body: Partial<RefineColumnBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { columnType, existingItems, userInput, requirements, policies } = body;

  if (
    columnType !== "requirements" &&
    columnType !== "policies" &&
    columnType !== "edgeCases"
  ) {
    return NextResponse.json(
      { error: "columnType은 requirements, policies, edgeCases 중 하나여야 합니다." },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(existingItems) ||
    !isValidExistingItems(columnType, existingItems) ||
    !userInput?.trim()
  ) {
    return NextResponse.json(
      { error: "existingItems(형식에 맞는 배열)와 userInput은 필수 입력값입니다." },
      { status: 400 }
    );
  }

  if (
    columnType === "policies" &&
    (!Array.isArray(requirements) || !requirements.every(isValidRequirement))
  ) {
    return NextResponse.json(
      { error: "policies 컬럼 보강에는 requirements 컨텍스트가 필요합니다." },
      { status: 400 }
    );
  }

  if (
    columnType === "edgeCases" &&
    (!Array.isArray(requirements) ||
      !requirements.every(isValidRequirement) ||
      !Array.isArray(policies) ||
      !policies.every(isValidPolicy))
  ) {
    return NextResponse.json(
      { error: "edgeCases 컬럼 보강에는 requirements와 policies 컨텍스트가 필요합니다." },
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
        columnType,
        existingItems,
        userInput,
        requirements: requirements as Requirement[] | undefined,
        policies: policies as Policy[] | undefined,
      }),
      messages: [
        {
          role: "user",
          content: "위 지침에 따라 새로 추가할 항목만 JSON으로 생성해줘.",
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
    console.error("[refine-column] Anthropic API 호출 실패:", error);
    return NextResponse.json(
      { error: "AI 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJson(responseText);
  } catch (error) {
    console.error("[refine-column] JSON 파싱 실패:", error, "\n원본 응답:", responseText);
    return NextResponse.json(
      { error: "AI 응답을 JSON으로 해석하지 못했습니다." },
      { status: 500 }
    );
  }

  const items = parseNewItems(columnType, parsed);
  if (!items) {
    console.error("[refine-column] 스키마 검증 실패:", parsed);
    return NextResponse.json(
      { error: "AI 응답이 예상된 형식과 일치하지 않습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ items });
}
