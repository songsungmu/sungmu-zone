import { PDFDocument } from "pdf-lib";

/**
 * 업로드된 PDF를 페이지별로 쪼개서 각각 base64 문자열로 반환한다. 페이지가
 * 많은 PDF를 한 번에 분석하면 Netlify 서버리스 함수의 30초 실행 제한을
 * 넘기기 쉬워서, 페이지 단위로 나눠 각각 짧게 분석하기 위한 전처리 단계다.
 * pdf-lib은 순수 JS라 네이티브 바이너리 없이 서버리스 환경에서도 잘 동작한다.
 */
export async function splitPdfIntoPages(base64: string): Promise<string[]> {
  const sourceBytes = Buffer.from(base64, "base64");
  const sourceDoc = await PDFDocument.load(sourceBytes);
  const pageCount = sourceDoc.getPageCount();

  const pages: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const pageDoc = await PDFDocument.create();
    const [copiedPage] = await pageDoc.copyPages(sourceDoc, [i]);
    pageDoc.addPage(copiedPage);
    const pageBytes = await pageDoc.save();
    pages.push(Buffer.from(pageBytes).toString("base64"));
  }

  return pages;
}
