"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader, StatusDot } from "@/components/workspace/Panel";
import {
  ToolCallLog,
  type ToolCallLogEntry,
} from "@/components/workspace/ToolCallLog";
import type { ChatMessage, ChatStreamEvent } from "@/types/chat";
import type { DocumentUploadState } from "@/types/document";
import type { AnalysisResult } from "@/types/review";

const DEFAULT_REQUEST_MESSAGE = "이 화면 정책 검토해줘";

/** 서버가 보내는 단계 이름을 사람이 읽는 라벨로 바꾼다. */
const STEP_LABELS: Record<string, string> = {
  analyze_document: "화면설계서 분석",
  get_company_policies: "기존 정책 불러오기",
  analyze_policies: "정책 분류 및 충돌 확인",
  analyze_exceptions: "예외 케이스 도출",
};

interface RawRequirement {
  id: string;
  title: string;
  description: string;
  sourceFrame: string | null;
}

/**
 * 이 패널의 역할은 "실행 과정을 투명하게 보여주기"로 한정한다.
 * 정책/요구사항/예외처리 데이터를 이 컴포넌트가 직접 들고 있지 않고,
 * 분석이 끝나면 onAnalysisComplete로 결과를 부모에 올려보내고 손을 뗀다.
 * 정책 요약 카드나 승인 버튼은 여기에 절대 렌더링하지 않는다.
 */
interface ClaudePanelProps {
  document: DocumentUploadState;
  onAnalysisComplete: (result: AnalysisResult) => void;
}

export function ClaudePanel({ document: doc, onAnalysisComplete }: ClaudePanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLogEntry[]>([]);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");

  // effect 본문에서도 true로 세팅해야 한다 — cleanup에서만 false로 바꾸면
  // React Strict Mode(dev)의 mount→cleanup→mount 이중 실행 때문에 실제로는
  // 마운트돼있는데도 이 값이 영구히 false로 남아, 아래 루프가 첫 반복에서
  // 조용히 return되고 아무 것도 업데이트되지 않는 문제가 있었다.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function sendMessage(userText: string) {
    const trimmed = userText.trim();
    if (isAnalyzing || !trimmed) return;

    if (!doc.base64 || !doc.mediaType) {
      setErrorText("먼저 화면설계서(PNG/PDF)를 업로드해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setSummaryText(null);
    setErrorText(null);
    setToolCalls([]);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);

    function pushToolCall(id: string, label: string) {
      if (!isMountedRef.current) return;
      setToolCalls((prev) => [...prev, { id, label, status: "running" }]);
    }
    function markToolCallDone(id: string) {
      if (!isMountedRef.current) return;
      setToolCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "done" } : c)));
    }

    try {
      // PDF는 페이지가 많으면 한 번에 분석할 때 서버 함수 실행 시간 제한을
      // 넘기기 쉬워서, 페이지별로 나눠 각각 짧게 분석한 뒤 결과를 합친다.
      // PNG는 화면 하나(또는 한 이미지 안의 여러 화면)를 한 번에 분석한다.
      let requirements: RawRequirement[] | null = null;

      if (doc.mediaType === "application/pdf") {
        pushToolCall("split_pdf", "PDF 페이지 분리");
        const splitRes = await fetch("/api/chat/pdf-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: doc.base64 }),
        });
        if (!splitRes.ok) {
          const errBody = (await splitRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errBody?.error ?? `PDF 페이지 분리에 실패했습니다 (${splitRes.status}).`);
        }
        const { pages } = (await splitRes.json()) as { pages: string[] };
        markToolCallDone("split_pdf");

        requirements = [];
        for (let i = 0; i < pages.length; i++) {
          const stepId = `analyze_page_${i + 1}`;
          pushToolCall(stepId, `페이지 분석 ${i + 1} / ${pages.length}`);
          const pageRes = await fetch("/api/chat/analyze-page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: pages[i], pageLabel: `${i + 1}페이지` }),
          });
          if (!pageRes.ok) {
            const errBody = (await pageRes.json().catch(() => null)) as { error?: string } | null;
            throw new Error(errBody?.error ?? `${i + 1}페이지 분석에 실패했습니다.`);
          }
          const pageData = (await pageRes.json()) as { requirements: RawRequirement[] };
          requirements.push(...pageData.requirements);
          markToolCallDone(stepId);
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          requirements
            ? { messages: nextMessages, fileName: doc.fileName, requirements }
            : {
                messages: nextMessages,
                fileName: doc.fileName,
                document: { mediaType: doc.mediaType, base64: doc.base64 },
              }
        ),
      });

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `요청이 실패했습니다 (${res.status}).`);
      }

      // /api/chat은 NDJSON(한 줄에 이벤트 하나)을 스트리밍한다 — 도구가
      // 실제로 호출/완료되는 시점에 맞춰 한 줄씩 도착하므로, 그대로 읽어서
      // toolCalls를 갱신한다(가짜 지연으로 재생하지 않는다).
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let settled = false;

      function handleEvent(event: ChatStreamEvent) {
        if (!isMountedRef.current) return;

        if (event.type === "tool_call") {
          pushToolCall(event.id, STEP_LABELS[event.name] ?? event.name);
        } else if (event.type === "tool_done") {
          markToolCallDone(event.id);
        } else if (event.type === "error") {
          throw new Error(event.message);
        } else if (event.type === "result") {
          settled = true;
          const finalText = event.finalText || "분석이 완료됐습니다.";
          setSummaryText(finalText);
          setMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
          setIsAnalyzing(false);

          onAnalysisComplete({
            requirements: event.requirements,
            policies: event.policies,
            conflicts: event.conflicts,
            exceptions: event.exceptions,
            summary: finalText,
            generatedAt: new Date().toISOString(),
          });
        }
      }

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          handleEvent(JSON.parse(line) as ChatStreamEvent);
        }
      }

      if (!settled) {
        throw new Error("분석 응답이 완료되지 않았습니다.");
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setErrorText(
        error instanceof Error ? error.message : "분석 요청 중 오류가 발생했습니다."
      );
      setIsAnalyzing(false);
    }
  }

  function handleStart() {
    if (isAnalyzing) return;
    const text = messageDraft.trim() || DEFAULT_REQUEST_MESSAGE;
    setMessageDraft("");
    void sendMessage(text);
  }

  const hasRun = toolCalls.length > 0 || summaryText !== null || errorText !== null;
  const status = isAnalyzing
    ? { tone: "active" as const, label: "분석 중" }
    : errorText
      ? { tone: "error" as const, label: "실패" }
      : summaryText
        ? { tone: "success" as const, label: "완료" }
        : { tone: "idle" as const, label: "대기" };

  return (
    <Panel>
      <PanelHeader
        title="정책 검토"
        aside={<StatusDot tone={status.tone}>{status.label}</StatusDot>}
      />

      <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
        {hasRun ? (
          <>
            <ToolCallLog calls={toolCalls} />

            {summaryText && (
              <p className="border-t pt-3 text-[13px] leading-relaxed text-foreground">
                {summaryText}
              </p>
            )}

            {errorText && (
              <div className="flex gap-2 rounded-md bg-status-conflict px-3 py-2.5 text-xs leading-relaxed text-status-conflict-foreground">
                <AlertCircle className="mt-px size-3.5 shrink-0" />
                <p className="min-w-0 break-words">{errorText}</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[13px] leading-relaxed text-foreground">
              화면설계서에서 요구사항을 추출하고, 회사 정책 시트와 비교해 정책과 예외
              케이스를 정리합니다.
            </p>
            <p className="text-xs text-muted-foreground">
              {doc.base64
                ? "필요하면 아래에 추가로 확인할 내용을 적고 검토를 시작하세요."
                : "먼저 화면설계서를 업로드하세요."}
            </p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t p-3">
        <Input
          placeholder="추가로 확인할 내용 (선택)"
          value={messageDraft}
          onChange={(e) => setMessageDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          disabled={isAnalyzing}
        />
        <Button
          className="shrink-0"
          onClick={handleStart}
          disabled={isAnalyzing || !doc.base64}
        >
          {isAnalyzing ? "분석 중" : summaryText ? "다시 검토" : "검토 시작"}
        </Button>
      </div>
    </Panel>
  );
}
