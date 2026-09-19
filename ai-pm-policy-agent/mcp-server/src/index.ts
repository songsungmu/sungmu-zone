import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { bearerAuth } from "./auth.js";
import { registerGetFigmaContextTool } from "./tools/get-figma-context.js";
import { registerGetCompanyPoliciesTool } from "./tools/get-company-policies.js";
import { registerAnalyzeRequirementsTool } from "./tools/analyze-requirements.js";
import { registerAnalyzePoliciesTool } from "./tools/analyze-policies.js";
import { registerAnalyzeExceptionsTool } from "./tools/analyze-exceptions.js";
import { registerGetChangeImpactTool } from "./tools/get-change-impact.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "ai-pm-policy-agent-mcp-server",
    version: "0.1.0",
  });

  // 아래 6개 도구는 전부 읽기/분석 전용이다. Google Sheet에 실제로 값을
  // 쓰는 도구는 이 서버에 절대 등록하지 않는다 — CLAUDE.md 필수 규칙.
  registerGetFigmaContextTool(server);
  registerGetCompanyPoliciesTool(server);
  registerAnalyzeRequirementsTool(server);
  registerAnalyzePoliciesTool(server);
  registerAnalyzeExceptionsTool(server);
  registerGetChangeImpactTool(server);

  return server;
}

const app = express();
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/mcp", bearerAuth, async (req, res) => {
  // 세션을 서버 메모리에 유지하지 않는 stateless 모드 — 요청마다 새
  // McpServer/transport를 만들고 처리가 끝나면 정리한다.
  const server = createServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("MCP 요청 처리 중 오류:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", bearerAuth, (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    })
  );
});

app.delete("/mcp", bearerAuth, (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    })
  );
});

const PORT = Number(process.env.PORT ?? 3100);
app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});
