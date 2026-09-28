export interface FigmaFrame {
  id: string;
  name: string;
  type: string;
}

export interface FigmaFileContext {
  fileName: string;
  frames: FigmaFrame[];
}

interface FigmaFileNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaFileNode[];
}

interface FigmaFileResponse {
  name: string;
  document: {
    children?: FigmaFileNode[];
  };
}

function extractFileKey(figmaFileUrl: string): string {
  const match = figmaFileUrl.match(
    /figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/
  );
  if (!match) {
    throw new Error("올바른 Figma 파일 URL이 아닙니다.");
  }
  return match[1];
}

/** 읽기 전용 조회 — Figma 파일을 절대 수정하지 않는다. */
export async function fetchFigmaFile(
  figmaFileUrl: string
): Promise<FigmaFileContext> {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error("FIGMA_ACCESS_TOKEN이 설정되지 않았습니다.");
  }
  const fileKey = extractFileKey(figmaFileUrl);

  // 이 도구는 최상위 프레임 이름만 필요하다(캔버스(페이지) -> 그 위의
  // 최상위 오브젝트까지). depth 파라미터 없이 호출하면 Figma가 모든
  // 프레임 내부의 레이어까지 전부 포함한 전체 트리를 만들어 보내는데,
  // 파일이 복잡할수록 이 응답이 커지고 느려지며 Figma 쪽 rate limit도
  // 더 빨리 소모시킨다. depth=2로 필요한 만큼만 받는다.
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}?depth=2`,
    { headers: { "X-Figma-Token": token } }
  );
  if (!response.ok) {
    // 429가 오래 지속되는 이유를 진단하려면 Retry-After/rate-limit 헤더가
    // 필요하다 — 응답 본문만으로는 "언제 풀리는지" 전혀 알 수 없다.
    const retryAfter = response.headers.get("retry-after");
    const rateLimitHeaders = Array.from(response.headers.entries())
      .filter(([key]) => key.toLowerCase().includes("rate"))
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    const diagnostics = [
      retryAfter ? `retry-after=${retryAfter}s` : null,
      rateLimitHeaders || null,
    ]
      .filter(Boolean)
      .join(" | ");
    throw new Error(
      `Figma API 오류 (${response.status}): ${await response.text()}${
        diagnostics ? ` [${diagnostics}]` : " [rate-limit 헤더 없음]"
      }`
    );
  }
  const data = (await response.json()) as FigmaFileResponse;

  // Figma 파일 트리는 document -> canvas(page) -> 최상위 프레임 순서다.
  const frames: FigmaFrame[] = [];
  for (const page of data.document.children ?? []) {
    for (const node of page.children ?? []) {
      frames.push({ id: node.id, name: node.name, type: node.type });
    }
  }

  return { fileName: data.name, frames };
}
