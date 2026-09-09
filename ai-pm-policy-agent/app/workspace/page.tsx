import { ClaudePanel } from "@/components/workspace/ClaudePanel";
import { FigmaPanel } from "@/components/workspace/FigmaPanel";
import { GoogleSheetPanel } from "@/components/workspace/GoogleSheetPanel";
import { Header } from "@/components/workspace/Header";
import { ReviewListPanel } from "@/components/workspace/ReviewListPanel";

export default function WorkspacePage() {
  return (
    <div className="flex h-screen flex-col bg-secondary/40">
      <Header />

      {/*
        grid-rows에 fr 단위를 쓰면 gap/padding을 제외한 나머지 공간을
        정확히 28:52:20 비율로 나눠준다 (flex-basis 퍼센트는 gap만큼
        컨테이너 밖으로 넘쳐서 페이지 스크롤이 생기는 문제가 있었음).
      */}
      <div className="grid min-h-0 flex-1 grid-rows-[28fr_52fr_20fr] gap-4 p-4">
        {/* 상단 2단 그리드 — 컴팩트하게, 전체 콘텐츠 영역의 28% */}
        <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
          <FigmaPanel />
          <ClaudePanel />
        </div>

        {/* 중단 리뷰 리스트 — 화면에서 가장 큰 비중, 52% */}
        <div className="min-h-0">
          <ReviewListPanel />
        </div>

        {/* 하단 시트 연결 — 20% */}
        <div className="min-h-0">
          <GoogleSheetPanel />
        </div>
      </div>
    </div>
  );
}
