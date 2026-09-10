const FIGMA_URL_PATTERN =
  /^https:\/\/(?:www\.)?figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)(?:\/([^/?#]*))?/;

interface ParsedFigmaUrl {
  key: string;
  fileName: string;
}

/** Figma 파일/디자인/프로토타입 URL인지 검증하고, URL 안의 제목 슬러그에서 파일명을 뽑아낸다. */
export function parseFigmaUrl(url: string): ParsedFigmaUrl | null {
  const match = url.trim().match(FIGMA_URL_PATTERN);
  if (!match) return null;

  const [, key, slug] = match;
  const fileName = slug
    ? decodeURIComponent(slug).replace(/-/g, " ")
    : "Figma 파일";

  return { key, fileName };
}

export function buildFigmaEmbedUrl(url: string): string {
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
}
