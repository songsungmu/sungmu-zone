import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * mcp-server의 도구(get_figma_context 등)는 전부 결정적인 순수 함수라 매
 * 호출마다 Claude의 판단이 필요 없다. 예전에는 Anthropic MCP Connector로
 * Claude가 5개 도구를 자동으로 순서대로 호출하게 했는데, 그러면 5번의
 * 도구 호출 + Claude의 판단 시간이 전부 Anthropic API 호출 ONE 안에
 * 누적되어 Netlify 함수 실행 시간(이 프로젝트는 30초)을 넘기곤 했다.
 * 이 함수는 그 대신 우리 서버가 도구를 직접, 짧게, 순서대로 호출한다.
 *
 * mcp-server는 세션을 유지하지 않는 stateless 모드로 동작하므로(요청마다
 * 새 McpServer 인스턴스), 도구 호출마다 매번 새 연결을 맺고 끊는다 —
 * 연결을 재사용하면 두 번째 호출부터 초기화(initialize) 핸드셰이크가
 * 안 된 서버 인스턴스에 요청을 보내게 된다.
 */
export async function callMcpTool<T>(
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const mcpServerUrl = process.env.MCP_SERVER_URL;
  const mcpServerToken = process.env.MCP_SERVER_AUTH_TOKEN;
  if (!mcpServerUrl || !mcpServerToken) {
    throw new Error("MCP_SERVER_URL / MCP_SERVER_AUTH_TOKEN이 설정되지 않았습니다.");
  }

  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl), {
    requestInit: {
      headers: { Authorization: `Bearer ${mcpServerToken}` },
    },
  });
  const client = new Client({ name: "ai-pm-policy-agent-web", version: "0.1.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: toolName, arguments: args });

    if (result.isError) {
      const text = Array.isArray(result.content)
        ? result.content
            .map((block) => ("text" in block ? block.text : ""))
            .join("")
        : "";
      throw new Error(text || `${toolName} 호출이 실패했습니다.`);
    }

    return result.structuredContent as T;
  } finally {
    await client.close().catch(() => {});
  }
}
