import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { parseMcpAnalysisResponse } from "@/lib/mcp-response-mapping";
import type { ChatAnalyzeResponse, ChatMessage } from "@/types/chat";

const MCP_SERVER_NAME = "ai-pm-policy-agent";

const SYSTEM_PROMPT = `당신은 분석 에이전트입니다. 정책을 확정하거나 회사 문서에 반영할 수 없습니다(그런 도구는 제공되지 않습니다). 근거 없는 정책은 need_decision으로 분류하세요.

사용자가 화면 정책 검토를 요청하면 다음 순서로 도구를 호출하세요:
1. get_figma_context로 현재 연결된 Figma 파일을 조회한다.
2. get_company_policies로 기존 정책 시트를 조회한다.
3. analyze_requirements로 요구사항 후보를 도출한다.
4. analyze_policies로 정책을 분류하고 충돌을 탐지한다.
5. analyze_exceptions로 예외처리 케이스를 도출한다.
모든 도구 호출이 끝나면 결과를 1~2문장으로 요약해서 답하세요.`;

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
      messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const result: ChatAnalyzeResponse = parseMcpAnalysisResponse(response.content);
    return NextResponse.json(result);
  } catch (error) {
    console.error("분석 요청 처리 중 오류:", error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
