import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export interface UploadedDocument {
  mediaType: "image/png" | "application/pdf";
  base64: string;
}

export interface RawRequirement {
  id: string;
  title: string;
  description: string;
  sourceFrame: string | null;
}

const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});

const DocumentAnalysisSchema = z.object({
  requirements: z.array(
    RequirementSchema.extend({
      /** 이 요구사항이 어느 화면(PNG는 파일 자체, PDF는 페이지)에서 나왔는지. */
      sourceFrame: z.string(),
    })
  ),
});

const SinglePageAnalysisSchema = z.object({
  requirements: z.array(RequirementSchema),
});

function buildContentBlock(doc: UploadedDocument) {
  return doc.mediaType === "application/pdf"
    ? ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: doc.base64 },
      } as const)
    : ({
        type: "image",
        source: { type: "base64", media_type: "image/png", data: doc.base64 },
      } as const);
}

/**
 * Figma API 대신 업로드된 PNG/PDF를 Claude Vision/문서 분석으로 직접 읽어
 * 요구사항을 도출한다. PNG는 파일 하나를 화면 하나로, PDF는 전체를 한 번에
 * 분석한다(페이지가 많으면 analyzeSinglePdfPage로 페이지별로 나눠 호출하는
 * 쪽을 대신 쓴다 — 이 함수는 PNG 및 짧은 PDF 전용).
 *
 * 이 호출은 Netlify 서버리스 함수의 30초 실행 제한 안에 끝나야 한다. 화면
 * 여러 개가 함께 담긴 복잡한 이미지에서는 medium/high effort가 그 시간을
 * 넘기는 걸 확인해서, 속도를 위해 low로 낮춘다.
 */
export async function extractRequirementsFromDocument(
  doc: UploadedDocument
): Promise<RawRequirement[]> {
  const client = new Anthropic();
  const contentBlock = buildContentBlock(doc);

  const instruction =
    doc.mediaType === "application/pdf"
      ? "이 PDF 화면설계서를 분석해주세요. 각 페이지를 화면 하나로 보고, 화면마다 사용자가 수행할 수 있는 구체적인 기능 요구사항을 도출하세요."
      : "이 화면설계서 이미지를 분석해주세요. 이미지 안에 여러 화면이 함께 있다면 각각을 화면 하나로 보고, 화면마다 사용자가 수행할 수 있는 구체적인 기능 요구사항을 도출하세요.";

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    output_config: { effort: "low", format: zodOutputFormat(DocumentAnalysisSchema) },
    system:
      "당신은 PM을 돕는 분석 에이전트입니다. 업로드된 화면설계서를 읽고 요구사항 후보를 구조화해서 반환하세요. requirements[].id는 FR-01, FR-02... 형식으로 순서대로 부여하고, sourceFrame에는 그 요구사항이 나온 화면 이름이나 페이지 번호(예: '1페이지', '로그인 화면')를 적으세요.",
    messages: [
      {
        role: "user",
        content: [contentBlock, { type: "text", text: instruction }],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("화면설계서에서 요구사항을 추출하지 못했습니다.");
  }

  return response.parsed_output.requirements;
}

/**
 * PDF 페이지 하나(단일 페이지로 쪼갠 PDF)만 분석한다. 페이지 수가 많은
 * PDF를 이 함수로 한 페이지씩 순서대로 호출하면, 호출 하나하나는
 * 가볍고 빨라서(내용이 한 페이지뿐이라) 30초 제한에 안전하게 들어온다.
 * 이 페이지가 원본의 몇 번째 페이지인지는 호출자가 이미 알고 있으므로
 * (pageLabel), Claude에게는 굳이 물어보지 않고 호출자가 직접 붙인다 —
 * 페이지 하나만 보고 있는 모델이 전체 문서에서 몇 번째인지 알 방법이
 * 없기 때문이다.
 */
export async function analyzeSinglePdfPage(
  base64: string,
  pageLabel: string
): Promise<RawRequirement[]> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2048,
    output_config: { effort: "low", format: zodOutputFormat(SinglePageAnalysisSchema) },
    system:
      "당신은 PM을 돕는 분석 에이전트입니다. 업로드된 화면설계서 페이지 하나를 읽고 요구사항 후보를 구조화해서 반환하세요. requirements[].id는 FR-01, FR-02... 형식으로 이 페이지 안에서만 순서대로 부여하세요(전체 문서 기준 번호는 신경 쓰지 않아도 됩니다).",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: "이 화면설계서 페이지를 분석해서, 사용자가 수행할 수 있는 구체적인 기능 요구사항을 도출해주세요.",
          },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(`${pageLabel} 분석에 실패했습니다.`);
  }

  return response.parsed_output.requirements.map((r) => ({
    ...r,
    sourceFrame: pageLabel,
  }));
}
