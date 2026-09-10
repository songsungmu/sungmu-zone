import { google } from "googleapis";

import { getGoogleSheetsAuth } from "@/lib/core/googleAuth";

/**
 * 회사 정책 저장소(Source of Truth) Google Sheet의 컬럼 구조.
 * A: Policy ID | B: 정책명 | C: 내용 | D: 적용 서비스 | E: 상태
 * F: 출처 | G: 관련 Figma | H: 관련 Requirement ID | I: 승인 시각 | J: 승인자
 *
 * 예외처리 케이스는 이 시트에 함께 저장하지 않는다 — 정책이 아니라
 * QA/개발 참고용 산출물에 가까워 지금은 Supabase에만 저장한다(Phase 10).
 */
export interface ExistingPolicy {
  policyId: string;
  policyName: string;
  content: string;
  appliedService: string;
  status: string;
  source: string;
  relatedFigma: string;
  relatedRequirementId: string;
}

export interface NewPolicyInput {
  policyName: string;
  content: string;
  appliedService: string;
  sourceFigma: string;
  relatedRequirementId: string;
}

export class GoogleSheetsError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "GoogleSheetsError";
  }
}

export class GoogleSheetsPermissionError extends GoogleSheetsError {
  constructor(cause?: unknown) {
    super("이 서비스 계정은 정책 시트에 접근할 권한이 없습니다.", cause);
    this.name = "GoogleSheetsPermissionError";
  }
}

export class GoogleSheetsNotFoundError extends GoogleSheetsError {
  constructor(cause?: unknown) {
    super("정책 시트를 찾을 수 없습니다 (GOOGLE_SHEET_ID를 확인하세요).", cause);
    this.name = "GoogleSheetsNotFoundError";
  }
}

export class PolicyNotFoundError extends Error {
  constructor(policyId: string) {
    super(`Policy ID "${policyId}"를 시트에서 찾을 수 없습니다.`);
    this.name = "PolicyNotFoundError";
  }
}

const DATA_RANGE = "A2:J";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleSheetsAuth() });
}

function getSheetId(): string {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new GoogleSheetsError("GOOGLE_SHEET_ID가 설정되지 않았습니다.");
  }
  return sheetId;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; response?: { status?: unknown } };
  if (typeof candidate.code === "number") return candidate.code;
  if (typeof candidate.response?.status === "number") return candidate.response.status;
  return undefined;
}

function isRetryableStatus(status: number | undefined): boolean {
  return status === 429 || (status !== undefined && status >= 500 && status < 600);
}

function toGoogleSheetsError(error: unknown): GoogleSheetsError {
  const status = extractStatusCode(error);
  if (status === 403) return new GoogleSheetsPermissionError(error);
  if (status === 404) return new GoogleSheetsNotFoundError(error);
  const message = error instanceof Error ? error.message : String(error);
  return new GoogleSheetsError(`Google Sheets API 오류: ${message}`, error);
}

/** 429/5xx 같은 일시적 오류만 최대 MAX_RETRIES회까지 짧은 대기 후 재시도한다. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = extractStatusCode(error);
      if (!isRetryableStatus(status) || attempt >= MAX_RETRIES) {
        throw toGoogleSheetsError(error);
      }
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

function rowToPolicy(row: unknown[]): ExistingPolicy {
  return {
    policyId: String(row[0] ?? ""),
    policyName: String(row[1] ?? ""),
    content: String(row[2] ?? ""),
    appliedService: String(row[3] ?? ""),
    status: String(row[4] ?? ""),
    source: String(row[5] ?? ""),
    relatedFigma: String(row[6] ?? ""),
    relatedRequirementId: String(row[7] ?? ""),
  };
}

interface PolicyRow {
  policy: ExistingPolicy;
  /** 1-based 시트 행 번호 (헤더=1, 첫 데이터 행=2) — updatePolicyStatus에서 사용. */
  rowNumber: number;
}

/** readExistingPolicies()의 내부 구현 — 행 번호까지 함께 들고 있어야 하는
 *  updatePolicyStatus에서도 재사용한다. */
async function readExistingPolicyRows(): Promise<PolicyRow[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const response = await withRetry(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: DATA_RANGE })
  );

  const rows = response.data.values ?? [];
  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row[0])
    .map(({ row, rowNumber }) => ({ policy: rowToPolicy(row), rowNumber }));
}

/**
 * 순수 조회 함수. 앱 시작 시/분석 요청 시마다 호출되며, 이 결과가
 * getNextPolicyId/checkDuplicateBeforeAppend/updatePolicyStatus가 각자
 * 필요한 만큼 다시 읽어서 쓰는 기준이 된다.
 */
export async function readExistingPolicies(): Promise<ExistingPolicy[]> {
  const rows = await readExistingPolicyRows();
  return rows.map((r) => r.policy);
}

const POLICY_ID_PATTERN = /^POL-(\d+)$/;

/** 순수 함수로 분리해서 실제 시트 조회 없이도 채번 로직을 검증할 수 있게 한다. */
function computeNextPolicyId(policies: ExistingPolicy[]): string {
  let maxNumber = 0;
  for (const policy of policies) {
    const match = policy.policyId.match(POLICY_ID_PATTERN);
    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  }
  return `POL-${String(maxNumber + 1).padStart(3, "0")}`;
}

export async function getNextPolicyId(): Promise<string> {
  const policies = await readExistingPolicies();
  return computeNextPolicyId(policies);
}

/**
 * PM이 리뷰 리스트에서 이미 [승인]을 클릭한 시점에만 호출되는 함수다.
 * 그래서 상태는 항상 "Active", 출처는 항상 "AI PM Policy Agent"로 고정한다.
 *
 * 승인자(J열)는 지금은 비워둔다 — 이 앱에 아직 로그인/사용자 식별 개념이
 * 없어 호출자가 넘겨줄 값이 없다. 나중에 붙이려면 이 함수 입력에
 * approvedBy를 추가하면 된다.
 */
export async function appendPolicy(
  policy: NewPolicyInput
): Promise<{ policyId: string }> {
  const policyId = await getNextPolicyId();
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const row = [
    policyId,
    policy.policyName,
    policy.content,
    policy.appliedService,
    "Active",
    "AI PM Policy Agent",
    policy.sourceFigma,
    policy.relatedRequirementId,
    new Date().toISOString(),
    "",
  ];

  await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A:J",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    })
  );

  return { policyId };
}

export async function updatePolicyStatus(
  policyId: string,
  newStatus: string
): Promise<void> {
  const rows = await readExistingPolicyRows();
  const target = rows.find((r) => r.policy.policyId === policyId);
  if (!target) {
    throw new PolicyNotFoundError(policyId);
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `E${target.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newStatus]] },
    })
  );
}

function extractKeywords(text: string): string[] {
  return Array.from(new Set(text.match(/[가-힣a-zA-Z0-9]{2,}/g) ?? []));
}

/** 순수 함수로 분리해서 실제 시트 조회 없이도 중복 판정 로직을 검증할 수 있게 한다. */
function isDuplicatePolicy(
  existing: ExistingPolicy[],
  policyName: string,
  content: string
): boolean {
  const normalizedName = policyName.trim();
  if (existing.some((p) => p.policyName.trim() === normalizedName)) {
    return true;
  }

  const keywords = extractKeywords(content);
  if (keywords.length === 0) return false;

  return existing.some((p) => {
    const existingKeywords = new Set(extractKeywords(p.content));
    const overlapCount = keywords.filter((k) => existingKeywords.has(k)).length;
    // 핵심 키워드의 과반이 겹치면 중복 의심으로 판단한다.
    return overlapCount / keywords.length >= 0.5;
  });
}

/**
 * appendPolicy 호출 전에 항상 먼저 실행해야 한다. true가 나오면 호출하는
 * 쪽(Phase 9의 approve API)이 "이미 유사한 정책이 있습니다"라는 확인
 * 메시지를 보여주고 사용자 재확인을 받도록 설계한다 — 여기서 자동으로
 * append를 막지는 않는다.
 */
export async function checkDuplicateBeforeAppend(
  policyName: string,
  content: string
): Promise<boolean> {
  const existing = await readExistingPolicies();
  return isDuplicatePolicy(existing, policyName, content);
}
