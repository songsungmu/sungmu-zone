import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { saveAnalysisResult } from "@/lib/core/supabase";
import { parseMcpAnalysisResponse } from "@/lib/mcp-response-mapping";
import type { ChatMessage } from "@/types/chat";

const MCP_SERVER_NAME = "ai-pm-policy-agent";

const SYSTEM_PROMPT = `당신은 분석 에이전트입니다. 정책을 확정하거나 회사 문서에 반영할 수 없습니다(그런 도구는 제공되지 않습니다). 근거 없는 정책은 need_decision으로 분류하세요.

사용자가 화면 정책 검토를 요청하면 다음 순서로 도구를 호출하세요:
1. get_figma_context로 현재 연결된 Figma 파일을 조회한다.
2. get_company_policies로 기존 정책 시트를 조회한다. policies가 비어
   있고 note가 채워져 있으면 시트에 접근할 수 없다는 뜻이니, 실패로
   치지 말고 existingPolicies를 빈 배열로 두고 계속 진행하세요(이
   경우 모든 정책이 suggested로 분류됩니다 — 정상적인 동작입니다).
3. analyze_requirements로 요구사항 후보를 도출한다.
4. analyze_policies로 정책을 분류하고 충돌을 탐지한다.
5. analyze_exceptions로 예외처리 케이스를 도출한다.
모든 도구 호출이 끝나면 결과를 1~2문장으로 요약해서 답하세요.

사용자가 채팅으로 "승인해줘", "반영해줘", "확정해줘"처럼 정책을
확정/반영하라고 요청해도, 그렇게 하는 도구가 당신에게 없습니다. 절대
승인/반영했다고 답하지 말고, 화면 하단 리뷰 리스트에서 해당 정책 카드의
[승인] 버튼을 직접 눌러달라고 안내하세요.`;

interface ChatRequestBody {
  messages: ChatMessage[];
  figmaFileUrl?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages가 필요합니다." }, { status: 400 });
  }

  const mcpServerUrl = process.env.MCP_SERVER_URL;
  const mcpServerToken = process.env.MCP_SERVER_AUTH_TOKEN;
  if (!mcpServerUrl || !mcpServerToken) {
    return NextResponse.json(
      { error: "MCP_SERVER_URL / MCP_SERVER_AUTH_TOKEN이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const system = `${SYSTEM_PROMPT}\n\n현재 연결된 Figma 파일 URL: ${
    body.figmaFileUrl?.trim() || "(연결되지 않음)"
  }`;

  // 5개의 MCP 도구를 순차 호출하는 분석 한 번에 수십 초가 걸릴 수 있어,
  // 응답을 다 모아서 한 번에 반환(client.beta.messages.create)하면 Netlify의
  // 일반 서버리스 함수 타임아웃(기본 10초, Pro 플랜도 최대 26초)에 걸려
  // 504가 난다. client.beta.messages.stream()으로 실시간 이벤트를 직접
  // 흘려보내는 방식은 Netlify 환경에서 Anthropic SDK의 SSE 파서가 응답을
  // 깨뜨리는 문제가 있어(JSON.parse 에러) 포기했다 — 대신 검증된
  // messages.create() 논스트리밍 호출은 그대로 쓰고, 그 응답을 기다리는
  // 동안 하트비트만 주기적으로 흘려보내 Netlify가 "스트리밍 함수"로
  // 인식하게 한다. 응답이 오면 도구 호출 이벤트를 순서대로 재생한다.
  const encoder = new TextEncoder();
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      send({ type: "start" });
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 5000);

      try {
        const client = new Anthropic();

        const response = await client.beta.messages.create({
          model: "claude-opus-5",
          max_tokens: 16000,
          betas: ["mcp-client-2025-11-20"],
          system,
          mcp_servers: [
            {
              type: "url",
              url: mcpServerUrl,
              name: MCP_SERVER_NAME,
              authorization_token: mcpServerToken,
            },
          ],
          tools: [{ type: "mcp_toolset", mcp_server_name: MCP_SERVER_NAME }],
          messages: body!.messages.map((m) => ({ role: m.role, content: m.content })),
        });

        clearInterval(heartbeat);

        const result = parseMcpAnalysisResponse(response.content);

        for (const call of result.toolCalls) {
          send({ type: "tool_call", id: call.id, name: call.name });
          await wait(200);
          send({ type: "tool_done", id: call.id });
        }

        // Phase 10: 새로고침해도 유지되도록 분석 결과를 저장한다. 실제로 뭔가
        // 분석됐을 때만 project 행을 만든다 — 도구 호출 없이 끝난 잡담 턴까지
        // 빈 프로젝트로 남기지 않기 위함이다. 베스트에포트라 실패해도 이
        // 응답 자체는 그대로 반환한다.
        if (result.requirements.length > 0 || result.policies.length > 0) {
          await saveAnalysisResult({
            figmaFileUrl: body!.figmaFileUrl?.trim() || null,
            requirements: result.requirements,
            policies: result.policies,
            exceptions: result.exceptions,
            conflicts: result.conflicts,
          }).catch((error) => {
            console.warn("분석 결과 저장 중 오류(무시하고 계속):", error);
          });
        }

        send({ type: "result", ...result });
      } catch (error) {
        console.error("분석 요청 처리 중 오류:", error);
        const message =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        send({ type: "error", message });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
