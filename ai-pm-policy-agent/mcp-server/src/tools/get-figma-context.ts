import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { fetchFigmaFile } from "../lib/figma.js";
import { figmaContextSchema } from "../lib/schemas.js";

export function registerGetFigmaContextTool(server: McpServer) {
  server.registerTool(
    "get_figma_context",
    {
      title: "Figma 화면설계서 조회",
      description:
        "Figma 파일 URL로 파일명과 최상위 프레임 목록을 조회한다. 읽기 전용이며 Figma 파일을 절대 수정하지 않는다.",
      inputSchema: {
        figmaFileUrl: z.string().describe("Figma 파일 URL"),
      },
      outputSchema: figmaContextSchema.shape,
    },
    async ({ figmaFileUrl }) => {
      const { fileName, frames } = await fetchFigmaFile(figmaFileUrl);
      const summary =
        frames.length > 0
          ? `${frames.length}개의 프레임(${frames
              .map((f) => f.name)
              .join(", ")})으로 구성되어 있습니다.`
          : "최상위 프레임을 찾을 수 없습니다.";

      const result = { fileName, frames, summary };
      return {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
