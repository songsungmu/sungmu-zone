export type SheetConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type SheetConnectionErrorReason = "no_permission" | "not_found";

/**
 * Google Sheet 연결 상태. app/workspace/page.tsx의 상위 state로 관리된다.
 * 실제 시트 읽기/쓰기는 아직 연결하지 않은 목업 상태 머신이다.
 */
export interface SheetConnectionState {
  sheetUrl: string;
  status: SheetConnectionStatus;
  policyCount: number | null;
  errorReason: SheetConnectionErrorReason | null;
}

/**
 * 실제 연동 전까지는 처음 진입했을 때도 바로 시연 가능하도록 이미
 * 연결된 상태(정책 38건)로 초기화해둔다.
 */
export const initialSheetConnectionState: SheetConnectionState = {
  sheetUrl: "https://docs.google.com/spreadsheets/d/mock-policy-sheet",
  status: "connected",
  policyCount: 38,
  errorReason: null,
};

export const MOCK_SERVICE_ACCOUNT_EMAIL =
  "pm-agent-sheets@ai-pm-policy-agent.iam.gserviceaccount.com";
