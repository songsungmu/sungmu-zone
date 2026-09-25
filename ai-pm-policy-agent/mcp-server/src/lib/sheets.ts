import { google } from "googleapis";

export interface PolicyRecord {
  id: string;
  policyName: string;
  content: string;
  category: string;
}

/**
 * 플랫폼 환경변수 입력창에서 private key의 개행이 "\n" 두 글자로
 * 이스케이프되거나 \r\n이 섞이거나 앞뒤에 따옴표가 함께 들어오는 경우가
 * 흔하다. PEM 헤더가 아예 안 보이면 base64로 통째로 인코딩된 값(권장 —
 * 줄바꿈이 깨질 여지가 없다)으로 보고 디코딩한다.
 */
function normalizePrivateKey(rawKey: string): string {
  const unquoted = rawKey.trim().replace(/^"([\s\S]*)"$/, "$1");
  if (!unquoted.includes("BEGIN PRIVATE KEY")) {
    return Buffer.from(unquoted, "base64").toString("utf8");
  }
  return unquoted.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * 읽기 전용 스코프(spreadsheets.readonly)만 사용한다. 이 서버는 어떤
 * 경로로도 Google Sheet에 값을 쓰지 않는다 — CLAUDE.md 필수 규칙.
 */
export async function fetchCompanyPolicies(): Promise<PolicyRecord[]> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const privateKey = rawPrivateKey
    ? normalizePrivateKey(rawPrivateKey)
    : undefined;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!email || !privateKey || !sheetId) {
    throw new Error("Google Sheets 연동 환경변수가 설정되지 않았습니다.");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // 시트 형식: A=id, B=policyName, C=content, D=category, 1행은 헤더
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "A2:D",
  });

  const rows = data.values ?? [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({
      id: String(row[0] ?? ""),
      policyName: String(row[1] ?? ""),
      content: String(row[2] ?? ""),
      category: String(row[3] ?? ""),
    }));
}
