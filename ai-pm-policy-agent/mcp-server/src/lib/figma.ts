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

  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { "X-Figma-Token": token },
  });
  if (!response.ok) {
    throw new Error(
      `Figma API 오류 (${response.status}): ${await response.text()}`
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
