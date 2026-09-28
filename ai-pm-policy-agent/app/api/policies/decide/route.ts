import { NextResponse } from "next/server";

import { recordDecision } from "@/lib/core/supabase";
import type { PolicyDecision } from "@/types/review";

/**
 * need_decision 항목 전용 — Supabase decisions 테이블에 선택 결과를
 * 기록만 한다. 선택 결과("신규 정책 적용")에 따라 이어서 approve API를
 * 호출할지는 프론트(app/workspace/page.tsx)가 결정한다 — 이 라우트
 * 자체는 approve를 호출하지 않는다.
 */
interface DecideRequestBody {
  policyId: string;
  selectedOption: PolicyDecision;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DecideRequestBody | null;

  if (!body?.policyId || !body.selectedOption) {
    return NextResponse.json(
      { error: "policyId/selectedOption이 필요합니다." },
      { status: 400 }
    );
  }

  await recordDecision(body.policyId, body.selectedOption);
  return NextResponse.json({ ok: true });
}
