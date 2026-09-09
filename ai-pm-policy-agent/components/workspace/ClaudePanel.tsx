"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ToolCallLog,
  type ToolCallLogEntry,
} from "@/components/workspace/ToolCallLog";
import type { AnalysisResult } from "@/types/review";

const MOCK_TOOL_STEPS: Omit<ToolCallLogEntry, "status">[] = [
  { id: "figma", label: 'get_figma_screen("현재 연결된 화면")' },
  { id: "policy", label: 'read_policy_sheet("적립 정책 v3")' },
  { id: "compare", label: "compare_requirements_with_policy()" },
];

const MOCK_ANALYSIS_ITEMS: Pick<
  AnalysisResult,
  "requirements" | "policies" | "edgeCases"
> = {
  requirements: [
    {
      id: "FR-01",
      title: "영수증 등록",
      description: "사용자는 영수증 이미지를 등록할 수 있다.",
      status: "confirmed",
    },
    {
      id: "FR-02",
      title: "사후 적립 신청",
      description: "등록된 영수증을 기준으로 사후 적립을 신청할 수 있다.",
      status: "suggested",
    },
  ],
  policies: [
    {
      id: "PL-01",
      title: "적립 가능 기간",
      description: "구매 후 30일 이내",
      status: "confirmed",
    },
    {
      id: "PL-02",
      title: "중복 적립 제한",
      description: "동일 영수증 1회만 적립 가능",
      status: "need-decision",
    },
    {
      id: "PL-03",
      title: "적립 한도",
      description: "화면설계서엔 없음, 정책 시트엔 1회 최대 10,000P",
      status: "conflict",
    },
  ],
  edgeCases: [
    {
      id: "EC-01",
      title: "OCR 실패",
      description: "영수증 인식 불가 → 재촬영 요청",
      status: "suggested",
    },
  ],
};

const MOCK_TOTAL_ITEM_COUNT =
  MOCK_ANALYSIS_ITEMS.requirements.length +
  MOCK_ANALYSIS_ITEMS.policies.length +
  MOCK_ANALYSIS_ITEMS.edgeCases.length;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * 이 패널의 역할은 "실행 과정을 투명하게 보여주기"로 한정한다.
 * 정책/요구사항/예외처리 데이터를 이 컴포넌트가 직접 들고 있지 않고,
 * 분석이 끝나면 onAnalysisComplete로 결과를 부모에 올려보내고 손을 뗀다.
 * 정책 요약 카드나 승인 버튼은 여기에 절대 렌더링하지 않는다.
 */
interface ClaudePanelProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

export function ClaudePanel({ onAnalysisComplete }: ClaudePanelProps) {
  const [toolCalls, setToolCalls] = useState<ToolCallLogEntry[]>([]);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");

  // effect 본문에서도 true로 세팅해야 한다 — cleanup에서만 false로 바꾸면
  // React Strict Mode(dev)의 mount→cleanup→mount 이중 실행 때문에 실제로는
  // 마운트돼있는데도 이 값이 영구히 false로 남아, 아래 for 루프가 첫
  // 반복에서 조용히 return되고 아무 것도 업데이트되지 않는 문제가 있었다.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function runAnalysis() {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setSummaryText(null);
    setToolCalls([]);

    for (const step of MOCK_TOOL_STEPS) {
      if (!isMountedRef.current) return;
      setToolCalls((prev) => [...prev, { ...step, status: "running" }]);
      await wait(500);
      if (!isMountedRef.current) return;
      setToolCalls((prev) =>
        prev.map((call) =>
          call.id === step.id ? { ...call, status: "done" } : call
        )
      );
    }

    if (!isMountedRef.current) return;

    const result: AnalysisResult = {
      ...MOCK_ANALYSIS_ITEMS,
      summary: `정책 ${MOCK_TOTAL_ITEM_COUNT}건을 분석했어요. 아래 리스트에서 확인해 주세요. (목업 응답)`,
      generatedAt: new Date().toISOString(),
    };
    setSummaryText(result.summary);
    setIsAnalyzing(false);
    onAnalysisComplete(result);
  }

  function handleSend() {
    if (isAnalyzing) return;
    setMessageDraft("");
    void runAnalysis();
  }

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            Claude
          </span>
          <Badge variant="outline" className="gap-1.5 font-normal">
            <span className="size-1.5 rounded-full bg-status-confirmed-foreground" />
            MCP 연결됨
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 overflow-auto py-3">
        <button
          type="button"
          onClick={() => void runAnalysis()}
          disabled={isAnalyzing}
          className="w-fit rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        >
          이 화면 정책 검토해줘
        </button>

        <ToolCallLog calls={toolCalls} />

        {summaryText && <p className="text-xs text-foreground">{summaryText}</p>}
      </CardContent>

      <div className="flex items-center gap-2 border-t p-3">
        <Input
          placeholder="메시지 입력"
          value={messageDraft}
          onChange={(e) => setMessageDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isAnalyzing}
          className="h-8 text-xs"
        />
        <Button
          size="icon"
          className="size-8 shrink-0"
          onClick={handleSend}
          disabled={isAnalyzing}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}
