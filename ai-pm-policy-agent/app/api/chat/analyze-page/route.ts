import { NextResponse } from "next/server";

import { analyzeSinglePdfPage } from "@/lib/core/documentAnalysis";

interface RequestBody {
  base64?: string;
  pageLabel?: string;
}

/**
 * PDF 한 페이지(단일 페이지로 쪼갠 PDF)만 분석한다. /api/chat/pdf-pages로
 * 나눈 페이지를 ClaudePanel이 순서대로 하나씩 이 엔드포인트에 보낸다 —
 * 페이지 하나만 보는 호출이라 가볍고 빨라서, 페이지 수가 많은 PDF도
 * 전체를 한 번에 분석할 때 걸리던 30초 타임아웃 없이 처리할 수 있다.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (!body?.base64 || !body.pageLabel) {
    return NextResponse.json(
      { error: "base64 / pageLabel이 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const requirements = await analyzeSinglePdfPage(body.base64, body.pageLabel);
    return NextResponse.json({ requirements });
  } catch (error) {
    console.error(`${body.pageLabel} 분석 중 오류:`, error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
