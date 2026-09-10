import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 정책 승인 이력 저장소. Supabase 프로젝트/테이블/마이그레이션은 아직
 * Phase 10에서 정식으로 만든다 — 여기서는 최소 클라이언트와 가정한
 * 스키마만 둔다.
 *
 * 가정 스키마 (Phase 10에서 확정):
 * - policies: analysis_policy_id(text, PK) | approval_status(text) |
 *   sheet_policy_id(text, nullable) | updated_at(timestamptz)
 * - decisions: id(uuid, PK) | analysis_policy_id(text) |
 *   selected_option(text) | decided_at(timestamptz)
 *
 * Google Sheet가 Source of Truth이므로, 이 파일의 모든 함수는
 * 베스트에포트로 동작한다 — Supabase가 미설정이거나 호출이 실패해도
 * 예외를 던지지 않고 경고만 로그한 뒤 호출자에게 안전한 기본값을
 * 돌려준다. 시트 쓰기 자체를 막지 않기 위함이다.
 */

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key);
  return cachedClient;
}

export async function getPolicyApprovalStatus(
  analysisPolicyId: string
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 승인 상태 조회를 건너뜁니다.");
    return null;
  }

  const { data, error } = await client
    .from("policies")
    .select("approval_status")
    .eq("analysis_policy_id", analysisPolicyId)
    .maybeSingle();

  if (error) {
    console.warn("[supabase] 승인 상태 조회 실패:", error.message);
    return null;
  }
  return (data?.approval_status as string | undefined) ?? null;
}

export async function markPolicyApproved(
  analysisPolicyId: string,
  sheetPolicyId: string | null
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 승인 기록을 건너뜁니다.");
    return;
  }

  const { error } = await client.from("policies").upsert({
    analysis_policy_id: analysisPolicyId,
    approval_status: "approved",
    sheet_policy_id: sheetPolicyId,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn("[supabase] 승인 기록 실패:", error.message);
}

export async function markPolicyRejected(analysisPolicyId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 반려 기록을 건너뜁니다.");
    return;
  }

  const { error } = await client.from("policies").upsert({
    analysis_policy_id: analysisPolicyId,
    approval_status: "rejected",
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn("[supabase] 반려 기록 실패:", error.message);
}

export async function recordDecision(
  analysisPolicyId: string,
  selectedOption: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 결정 기록을 건너뜁니다.");
    return;
  }

  const { error } = await client.from("decisions").insert({
    analysis_policy_id: analysisPolicyId,
    selected_option: selectedOption,
    decided_at: new Date().toISOString(),
  });
  if (error) console.warn("[supabase] 결정 기록 실패:", error.message);
}
