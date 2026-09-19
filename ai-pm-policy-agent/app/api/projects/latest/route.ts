import { NextResponse } from "next/server";

import { loadLatestProject } from "@/lib/core/supabase";

/**
 * 페이지 로드 시 호출된다 — 새로고침해도 리뷰 리스트가 사라지지 않도록
 * 가장 최근 분석 결과를 복원한다. 저장된 프로젝트가 없으면(최초 실행,
 * 또는 Supabase 미설정) result: null을 반환하고, 프론트는 기존처럼
 * 목업 데이터로 폴백한다.
 */
export async function GET() {
  const result = await loadLatestProject();
  return NextResponse.json({ result });
}
