import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { extractJson } from "@/lib/ai-json";
import { isValidRequirement } from "@/lib/planner-parsers";
import type { Requirement } from "@/types/planner";

export const runtime = "nodejs";

interface AttachmentInput {
  mimeType: string;
  base64Data: string;
  fileName: string;
}

interface GenerateRequirementsBody {
  functionName: string;
  requirementDraft: string;
  target: string;
  goal: string;
  attachments?: AttachmentInput[];
}

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set(["application/pdf", "image/png"]);
// 원본 파일 10MB 기준 base64 인코딩 시 늘어나는 길이(약 4/3배)에 여유를 더한 상한.
const MAX_BASE64_LENGTH = Math.ceil((10 * 1024 * 1024 * 4) / 3) + 1024;
const MAX_ATTACHMENTS = 3;

const SYSTEM_PROMPT_TEMPLATE = `당신은 15년차 시니어 프로덕트 매니저입니다.
아래 상위 기획 정보와 첨부된 참고 문서를 함께 분석하여, 개발 가능한 수준의
상세 기능 요구사항을 도출하세요.

[기능명] {{functionName}}
[요구사항 초안] {{requirementDraft}}
[타겟 사용자] {{target}}
[목표] {{goal}}
(첨부 문서는 별도 파일로 함께 전달됨)

지침:
- 첨부된 문서가 있다면, 반드시 문서 내용을 먼저 꼼꼼히 읽고 분석에 반영하세요.
  문서에 없는 내용을 문서에서 나온 것처럼 서술하지 마세요.
- 요구사항 초안(텍스트)은 PM의 의도와 방향을 나타내고, 첨부 문서는 확정된
  사실/정책/용어를 나타냅니다. 두 소스가 서로 다른 내용을 말하면 문서를
  우선하고, description에 "(문서 기준, 초안과 다름)"처럼 명시하세요.
- 요구사항은 사용자 행동 흐름 순서대로 나열하세요
- 각 요구사항은 "사용자는 ~할 수 있다" 또는 "시스템은 ~한다" 형식으로 작성
- 이 단계에서는 숫자/기간/한도 같은 정책적 판단은 넣지 말고 "기능"만 정의하세요
- 최소 4개, 최대 8개
- 각 항목에 source 필드를 추가하여 "document"(문서에서 도출) 또는
  "inferred"(문서에 없어 AI가 추론) 중 하나로 표시하세요
- 반드시 아래 JSON 스키마로만 응답하세요. 다른 설명 텍스트는 절대 포함하지 마세요.

{ "requirements": [ { "id": "FR-01", "title": "짧은 제목", "description": "상세 설명", "type": "기능", "source": "document" } ] }`;

function buildSystemPrompt(
  body: Pick<GenerateRequirementsBody, "functionName" | "requirementDraft" | "target" | "goal">
): string {
  return SYSTEM_PROMPT_TEMPLATE.replace("{{functionName}}", body.functionName)
    .replace("{{requirementDraft}}", body.requirementDraft)
    .replace("{{target}}", body.target)
    .replace("{{goal}}", body.goal);
}

function isValidAttachment(item: unknown): item is AttachmentInput {
  if (typeof item !== "object" || item === null) return false;
  const { mimeType, base64Data, fileName } = item as Record<string, unknown>;
  return (
    typeof mimeType === "string" &&
    ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType) &&
    typeof base64Data === "string" &&
    base64Data.length > 0 &&
    base64Data.length <= MAX_BASE64_LENGTH &&
    typeof fileName === "string"
  );
}

function buildContentBlocks(attachments: AttachmentInput[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = attachments.map((attachment) => {
    if (attachment.mimeType === "application/pdf") {
      return {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: attachment.base64Data,
        },
      };
    }
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: attachment.base64Data,
      },
    };
  });

  blocks.push({
    type: "text",
    text: "위 지침에 따라 상세 요구사항을 JSON으로 생성해줘.",
  });

  return blocks;
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
  if (!rawItems.every(isValidRequirement)) {
    return null;
  }

  const requirements = rawItems.map((item) => {
    const rawSource = (item as { source?: unknown }).source;
    const source = rawSource === "document" ? ("document" as const) : ("inferred" as const);
    return { ...item, status: "ai_suggested" as const, source };
  });

  return requirements.length > 0 ? requirements : null;
}

export async function POST(request: Request) {
  let body: Partial<GenerateRequirementsBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { functionName, requirementDraft, target, goal, attachments } = body;
  if (!functionName || !requirementDraft || !target || !goal) {
    return NextResponse.json(
      { error: "기능명, 요구사항 초안, 타겟, 목표는 필수 입력값입니다." },
      { status: 400 }
    );
  }

  const attachmentList = attachments ?? [];
  if (
    !Array.isArray(attachmentList) ||
    attachmentList.length > MAX_ATTACHMENTS ||
    !attachmentList.every(isValidAttachment)
  ) {
    return NextResponse.json(
      {
        error: `첨부파일은 PDF 또는 PNG, 파일당 10MB 이하, 최대 ${MAX_ATTACHMENTS}개까지만 가능합니다.`,
      },
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
      system: buildSystemPrompt({ functionName, requirementDraft, target, goal }),
      messages: [
        {
          role: "user",
          content: buildContentBlocks(attachmentList),
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
    const message =
      attachmentList.length > 0
        ? "첨부 파일을 처리하는 중 오류가 발생했습니다. 파일이 손상되지 않았는지 확인 후 다시 시도해주세요."
        : "AI 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
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
