import { google } from "googleapis";

export interface PolicyRecord {
  id: string;
  policyName: string;
  content: string;
  category: string;
}

/**
 * 읽기 전용 스코프(spreadsheets.readonly)만 사용한다. 이 서버는 어떤
 * 경로로도 Google Sheet에 값을 쓰지 않는다 — CLAUDE.md 필수 규칙.
 */
export async function fetchCompanyPolicies(): Promise<PolicyRecord[]> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
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
