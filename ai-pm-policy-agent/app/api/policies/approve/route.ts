import { NextResponse } from "next/server";

import {
  appendPolicy,
  checkDuplicateBeforeAppend,
  updatePolicyStatus,
} from "@/lib/core/googleSheets";
import { getPolicyApprovalStatus, markPolicyApproved } from "@/lib/core/supabase";
import type { PolicyItem } from "@/types/review";

/**
 * PM이 리뷰 리스트에서 [승인]을 눌렀을 때만 호출되는 경로다. Phase 7의
 * 채팅/AI 경로(app/api/chat/route.ts, lib/mcp-response-mapping.ts)와는
 * 코드 레벨에서 완전히 분리되어 있다 — 이 파일은 Anthropic SDK를 전혀
 * import하지 않고, Phase 8의 Google Sheets 함수만 호출한다.
 */
interface ApproveRequestBody {
  policy: PolicyItem;
  figmaFileUrl?: string;
  /** checkDuplicateBeforeAppend가 true를 반환해도 강행할 때 프론트가 세팅 */
  force?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ApproveRequestBody | null;
  const policy = body?.policy;

  if (!policy?.id || !policy.title || !policy.content) {
    return NextResponse.json({ error: "policy가 필요합니다." }, { status: 400 });
  }

  const currentStatus = await getPolicyApprovalStatus(policy.id);
  if (currentStatus === "approved") {
    return NextResponse.json({ error: "이미 승인된 정책입니다." }, { status: 409 });
  }

  const sourceType = policy.sourceType ?? "ai_suggested";

  try {
    if (!body?.force) {
      const isDuplicate = await checkDuplicateBeforeAppend(policy.title, policy.content);
      if (isDuplicate) {
        return NextResponse.json({
          needsConfirmation: true,
          reason: "이미 유사한 정책이 시트에 있습니다.",
        });
      }
    }

    let sheetPolicyId: string;

    if (sourceType === "company_sheet") {
      if (!policy.sourceRef) {
        return NextResponse.json(
          { error: "company_sheet 정책에는 sourceRef(시트 Policy ID)가 필요합니다." },
          { status: 400 }
        );
      }
      await updatePolicyStatus(policy.sourceRef, "Active");
      sheetPolicyId = policy.sourceRef;
    } else {
      const result = await appendPolicy({
        policyName: policy.title,
        content: policy.content,
        appliedService: "",
        sourceFigma: body?.figmaFileUrl ?? "",
        relatedRequirementId: policy.sourceRef ?? "",
      });
      sheetPolicyId = result.policyId;
    }

    await markPolicyApproved(policy.id, sheetPolicyId);
    return NextResponse.json({ policyId: sheetPolicyId });
  } catch (error) {
    console.error("정책 승인 처리 중 오류:", error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
