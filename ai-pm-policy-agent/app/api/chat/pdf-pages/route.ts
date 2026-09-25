import { NextResponse } from "next/server";

import { splitPdfIntoPages } from "@/lib/core/pdfSplit";

interface RequestBody {
  base64?: string;
}

/**
 * PDF를 페이지별로 쪼갠다. 순수 계산(pdf-lib)이라 Claude를 전혀 호출하지
 * 않고, 페이지 수가 많아도 순식간에 끝난다 — ClaudePanel이 이 결과를 받아
 * 페이지마다 /api/chat/analyze-page를 순서대로 호출한다.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (!body?.base64) {
    return NextResponse.json({ error: "PDF base64 데이터가 필요합니다." }, { status: 400 });
  }

  try {
    const pages = await splitPdfIntoPages(body.base64);
    return NextResponse.json({ pages });
  } catch (error) {
    console.error("PDF 페이지 분리 중 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: `PDF를 페이지별로 나누지 못했습니다: ${message}` }, { status: 500 });
  }
}
