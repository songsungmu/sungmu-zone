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
import type { ChatMessage, ChatStreamEvent } from "@/types/chat";
import type { DocumentUploadState } from "@/types/document";
import type { AnalysisResult } from "@/types/review";

const QUICK_ACTION_MESSAGE = "이 화면 정책 검토해줘";

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
      setErrorText("먼저 왼쪽에서 화면설계서(PNG/PDF)를 업로드해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setSummaryText(null);
    setErrorText(null);
    setToolCalls([]);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          document: {
            fileName: doc.fileName,
            mediaType: doc.mediaType,
            base64: doc.base64,
          },
        }),
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
          setToolCalls((prev) => [
            ...prev,
            { id: event.id, label: `${event.name}()`, status: "running" },
          ]);
        } else if (event.type === "tool_done") {
          setToolCalls((prev) =>
            prev.map((c) => (c.id === event.id ? { ...c, status: "done" } : c))
          );
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

  function handleSend() {
    if (isAnalyzing || !messageDraft.trim()) return;
    const text = messageDraft;
    setMessageDraft("");
    void sendMessage(text);
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
          onClick={() => void sendMessage(QUICK_ACTION_MESSAGE)}
          disabled={isAnalyzing || !doc.base64}
          className="w-fit rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        >
          {QUICK_ACTION_MESSAGE}
        </button>

        <ToolCallLog calls={toolCalls} />

        {summaryText && <p className="text-xs text-foreground">{summaryText}</p>}
        {errorText && <p className="text-xs text-destructive">{errorText}</p>}
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
