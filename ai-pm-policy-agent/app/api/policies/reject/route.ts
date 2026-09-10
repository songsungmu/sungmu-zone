import { NextResponse } from "next/server";

import { markPolicyRejected } from "@/lib/core/supabase";

/**
 * 시트에는 절대 반영하지 않는다 — Supabase에만 approval_status를
 * "rejected"로 기록한다. Phase 7의 AI 경로와는 무관하다.
 */
interface RejectRequestBody {
  policyId: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RejectRequestBody | null;

  if (!body?.policyId) {
    return NextResponse.json({ error: "policyId가 필요합니다." }, { status: 400 });
  }

  await markPolicyRejected(body.policyId);
  return NextResponse.json({ ok: true });
}
