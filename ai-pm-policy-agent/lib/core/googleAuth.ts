import { google } from "googleapis";
import type { JWT } from "google-auth-library";

/**
 * 플랫폼 환경변수 입력창에 개행을 직접 넣지 못해 .env/Netlify/Railway 등에서
 * private key의 개행이 "\n" 두 글자로 이스케이프되거나, 붙여넣는 과정에서
 * \r\n이 섞이거나, 앞뒤에 따옴표가 함께 들어오는 경우가 흔하다. PEM 헤더가
 * 아예 안 보이면 base64로 통째로 인코딩된 값(권장 — 줄바꿈이 깨질 여지가
 * 없다)으로 보고 디코딩한다.
 */
function normalizePrivateKey(rawKey: string): string {
  const unquoted = rawKey.trim().replace(/^"([\s\S]*)"$/, "$1");
  if (!unquoted.includes("BEGIN PRIVATE KEY")) {
    return Buffer.from(unquoted, "base64").toString("utf8");
  }
  return unquoted.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

let cachedAuth: JWT | null = null;

/**
 * 정책 시트 읽기+쓰기용 JWT 클라이언트. mcp-server/src/lib/sheets.ts는
 * 읽기 전용(spreadsheets.readonly) 스코프만 쓰지만, 이 클라이언트는
 * Phase 9 승인 엔드포인트에서 실제로 시트에 쓰기 위해 쓰기 스코프까지
 * 포함한다 — CLAUDE.md가 금지하는 건 "AI 도구 호출 경로"에 쓰기 권한을
 * 주는 것이지, 사람의 승인 클릭 이후에 실행되는 이 경로가 아니다.
 */
export function getGoogleSheetsAuth(): JWT {
  if (cachedAuth) return cachedAuth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawPrivateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY가 설정되지 않았습니다."
    );
  }

  cachedAuth = new google.auth.JWT({
    email,
    key: normalizePrivateKey(rawPrivateKey),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return cachedAuth;
}
