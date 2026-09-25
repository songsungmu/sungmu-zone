export type DocumentUploadStatus = "idle" | "uploaded";

/**
 * 업로드된 화면설계서 파일 상태. Figma 연동을 완전히 대체한다 — PNG는
 * 이미지 하나를 화면 하나로, PDF는 각 페이지를 화면 하나로 취급해 Claude가
 * 직접 읽고 요구사항을 도출한다(app/workspace/page.tsx의 상위 state로 관리).
 */
export interface DocumentUploadState {
  fileName: string | null;
  mediaType: "image/png" | "application/pdf" | null;
  /** data URL 접두사(data:...;base64,)를 뗀 순수 base64 문자열. */
  base64: string | null;
  status: DocumentUploadStatus;
  error: string | null;
}

export const initialDocumentUploadState: DocumentUploadState = {
  fileName: null,
  mediaType: null,
  base64: null,
  status: "idle",
  error: null,
};
