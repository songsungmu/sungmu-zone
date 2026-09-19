import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  AnalysisResult,
  ExceptionItem,
  PolicyConflict,
  PolicyItem,
  RequirementItem,
} from "@/types/review";

/**
 * 분석 결과와 승인 이력의 영속화 계층. 스키마는
 * supabase/migrations/0001_init.sql 참고 — projects 1행 = 분석(채팅
 * 응답) 1회, 그 아래로 requirements/policies/exceptions/policy_conflicts가
 * project_id로 묶이고 trace_links가 이들 사이 연결 관계를 기록한다.
 *
 * Google Sheet가 정책의 Source of Truth이므로, 이 파일의 모든 함수는
 * 베스트에포트로 동작한다 — Supabase가 미설정이거나 호출이 실패해도
 * 예외를 던지지 않고 경고만 로그한 뒤 안전한 기본값을 돌려준다.
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

async function getLatestProjectId(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client
    .from("projects")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[supabase] 최근 프로젝트 조회 실패:", error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

function inferEntityType(id: string): "requirement" | "policy" | null {
  if (id.startsWith("FR-")) return "requirement";
  if (id.startsWith("PL-")) return "policy";
  return null;
}

/**
 * 분석 완료 시점(app/api/chat/route.ts)에 호출한다. 새 project 행을 만들고
 * requirements/policies/exceptions/policy_conflicts를 일괄 insert한 뒤,
 * 정책→근거/기존정책, 충돌, 예외→원인 관계를 trace_links에 기록한다.
 */
export async function saveAnalysisResult(input: {
  figmaFileUrl: string | null;
  requirements: RequirementItem[];
  policies: PolicyItem[];
  exceptions: ExceptionItem[];
  conflicts: PolicyConflict[];
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 분석 결과 저장을 건너뜁니다.");
    return;
  }

  const { data: project, error: projectError } = await client
    .from("projects")
    .insert({ figma_file_url: input.figmaFileUrl })
    .select("id")
    .single();
  if (projectError || !project) {
    console.warn("[supabase] 프로젝트 생성 실패:", projectError?.message);
    return;
  }
  const projectId = project.id as string;

  if (input.requirements.length > 0) {
    const { error } = await client.from("requirements").insert(
      input.requirements.map((r) => ({
        project_id: projectId,
        analysis_id: r.id,
        title: r.title,
        description: r.description,
        source_frame: r.sourceFrame ?? null,
      }))
    );
    if (error) console.warn("[supabase] requirements 저장 실패:", error.message);
  }

  if (input.policies.length > 0) {
    const { error } = await client.from("policies").insert(
      input.policies.map((p) => ({
        project_id: projectId,
        analysis_id: p.id,
        title: p.title,
        content: p.content,
        classification: p.classification,
        rationale: p.rationale ?? null,
        source_type: p.sourceType ?? null,
        source_ref: p.sourceRef ?? null,
      }))
    );
    if (error) console.warn("[supabase] policies 저장 실패:", error.message);
  }

  if (input.exceptions.length > 0) {
    const { error } = await client.from("exceptions").insert(
      input.exceptions.map((e) => ({
        project_id: projectId,
        analysis_id: e.id,
        situation: e.situation,
        handling: e.handling,
        category: e.category,
        source_ref: e.sourceRef ?? null,
      }))
    );
    if (error) console.warn("[supabase] exceptions 저장 실패:", error.message);
  }

  if (input.conflicts.length > 0) {
    const { error } = await client.from("policy_conflicts").insert(
      input.conflicts
        .filter((c) => c.existingPolicyRef && c.newPolicyId)
        .map((c) => ({
          project_id: projectId,
          title: c.title,
          existing_policy: c.existingPolicy,
          new_policy: c.newPolicy,
          existing_policy_ref: c.existingPolicyRef,
          new_policy_id: c.newPolicyId,
        }))
    );
    if (error) console.warn("[supabase] policy_conflicts 저장 실패:", error.message);
  }

  const traceLinks: {
    project_id: string;
    source_type: string;
    source_id: string;
    target_type: string;
    target_id: string;
    relation: string;
  }[] = [];

  for (const policy of input.policies) {
    if (!policy.sourceRef) continue;
    if (policy.sourceType === "ai_suggested") {
      traceLinks.push({
        project_id: projectId,
        source_type: "policy",
        source_id: policy.id,
        target_type: "requirement",
        target_id: policy.sourceRef,
        relation: "derived_from",
      });
    } else if (policy.sourceType === "company_sheet") {
      traceLinks.push({
        project_id: projectId,
        source_type: "policy",
        source_id: policy.id,
        target_type: "sheet_policy",
        target_id: policy.sourceRef,
        relation: "matches_existing",
      });
    }
  }

  for (const conflict of input.conflicts) {
    if (!conflict.existingPolicyRef || !conflict.newPolicyId) continue;
    traceLinks.push({
      project_id: projectId,
      source_type: "policy",
      source_id: conflict.newPolicyId,
      target_type: "sheet_policy",
      target_id: conflict.existingPolicyRef,
      relation: "conflicts_with",
    });
  }

  for (const exception of input.exceptions) {
    if (!exception.sourceRef) continue;
    const sourceEntityType = inferEntityType(exception.sourceRef);
    if (!sourceEntityType) continue;
    traceLinks.push({
      project_id: projectId,
      source_type: "exception",
      source_id: exception.id,
      target_type: sourceEntityType,
      target_id: exception.sourceRef,
      relation: "raised_by",
    });
  }

  if (traceLinks.length > 0) {
    const { error } = await client.from("trace_links").insert(traceLinks);
    if (error) console.warn("[supabase] trace_links 저장 실패:", error.message);
  }
}

/**
 * 페이지 로드 시(app/api/projects/latest) 호출한다. 가장 최근 project와
 * 그 아래 데이터를 프론트 AnalysisResult 형태로 복원한다. 저장된 프로젝트가
 * 하나도 없으면 null을 돌려주고, 호출자는 목업 데이터로 폴백한다.
 */
export async function loadLatestProject(): Promise<AnalysisResult | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 최근 프로젝트 복원을 건너뜁니다.");
    return null;
  }

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (projectError || !project) {
    if (projectError) console.warn("[supabase] 최근 프로젝트 조회 실패:", projectError.message);
    return null;
  }
  const projectId = project.id as string;

  const [{ data: requirementRows }, { data: policyRows }, { data: exceptionRows }, { data: conflictRows }] =
    await Promise.all([
      client
        .from("requirements")
        .select("analysis_id, title, description, source_frame")
        .eq("project_id", projectId),
      client
        .from("policies")
        .select(
          "analysis_id, title, content, classification, rationale, source_type, source_ref, approval_status"
        )
        .eq("project_id", projectId),
      client
        .from("exceptions")
        .select("analysis_id, situation, handling, category, source_ref")
        .eq("project_id", projectId),
      client
        .from("policy_conflicts")
        .select("title, existing_policy, new_policy, existing_policy_ref, new_policy_id")
        .eq("project_id", projectId),
    ]);

  const requirements: RequirementItem[] = (requirementRows ?? []).map((r) => ({
    id: r.analysis_id,
    title: r.title,
    description: r.description,
    sourceFrame: r.source_frame ?? undefined,
  }));

  const policies: PolicyItem[] = (policyRows ?? []).map((p) => ({
    id: p.analysis_id,
    title: p.title,
    content: p.content,
    classification: p.classification,
    rationale: p.rationale ?? undefined,
    sourceType: p.source_type ?? undefined,
    sourceRef: p.source_ref ?? null,
    approvalStatus: p.approval_status ?? undefined,
  }));

  const exceptions: ExceptionItem[] = (exceptionRows ?? []).map((e) => ({
    id: e.analysis_id,
    situation: e.situation,
    handling: e.handling,
    category: e.category,
    sourceRef: e.source_ref ?? null,
  }));

  const conflicts: PolicyConflict[] = (conflictRows ?? []).map((c, index) => ({
    id: `${c.existing_policy_ref}-${c.new_policy_id}-${index}`,
    title: c.title,
    existingPolicy: c.existing_policy,
    newPolicy: c.new_policy,
    existingPolicyRef: c.existing_policy_ref,
    newPolicyId: c.new_policy_id,
  }));

  return {
    requirements,
    policies,
    exceptions,
    conflicts,
    summary: "이전에 저장된 분석 결과를 불러왔습니다.",
    generatedAt: project.created_at as string,
  };
}

export async function getPolicyApprovalStatus(
  policyAnalysisId: string
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 승인 상태 조회를 건너뜁니다.");
    return null;
  }

  const projectId = await getLatestProjectId(client);
  if (!projectId) return null;

  const { data, error } = await client
    .from("policies")
    .select("approval_status")
    .eq("project_id", projectId)
    .eq("analysis_id", policyAnalysisId)
    .maybeSingle();

  if (error) {
    console.warn("[supabase] 승인 상태 조회 실패:", error.message);
    return null;
  }
  return (data?.approval_status as string | undefined) ?? null;
}

export async function markPolicyApproved(
  policyAnalysisId: string,
  sheetPolicyId: string | null
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 승인 기록을 건너뜁니다.");
    return;
  }

  const projectId = await getLatestProjectId(client);
  if (!projectId) {
    console.warn("[supabase] 저장된 프로젝트가 없어 승인 기록을 건너뜁니다.");
    return;
  }

  const { error } = await client
    .from("policies")
    .update({
      approval_status: "approved",
      sheet_policy_id: sheetPolicyId,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("analysis_id", policyAnalysisId);
  if (error) console.warn("[supabase] 승인 기록 실패:", error.message);
}

export async function markPolicyRejected(policyAnalysisId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 반려 기록을 건너뜁니다.");
    return;
  }

  const projectId = await getLatestProjectId(client);
  if (!projectId) {
    console.warn("[supabase] 저장된 프로젝트가 없어 반려 기록을 건너뜁니다.");
    return;
  }

  const { error } = await client
    .from("policies")
    .update({ approval_status: "rejected", updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("analysis_id", policyAnalysisId);
  if (error) console.warn("[supabase] 반려 기록 실패:", error.message);
}

export async function recordDecision(
  policyAnalysisId: string,
  selectedOption: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[supabase] 설정되지 않아 결정 기록을 건너뜁니다.");
    return;
  }

  const projectId = await getLatestProjectId(client);
  if (!projectId) {
    console.warn("[supabase] 저장된 프로젝트가 없어 결정 기록을 건너뜁니다.");
    return;
  }

  const { error } = await client.from("decisions").insert({
    project_id: projectId,
    policy_analysis_id: policyAnalysisId,
    selected_option: selectedOption,
    decided_at: new Date().toISOString(),
  });
  if (error) console.warn("[supabase] 결정 기록 실패:", error.message);
}
