export type FigmaConnectionStatus = "disconnected" | "connected";

/**
 * Figma 연결 상태. app/workspace/page.tsx의 상위 state로 관리되며,
 * Phase 7의 분석 요청 시 이 값을 그대로 함께 전달한다.
 */
export interface FigmaConnectionState {
  url: string;
  status: FigmaConnectionStatus;
  fileName: string | null;
  error: string | null;
}

export const initialFigmaConnectionState: FigmaConnectionState = {
  url: "",
  status: "disconnected",
  fileName: null,
  error: null,
};
