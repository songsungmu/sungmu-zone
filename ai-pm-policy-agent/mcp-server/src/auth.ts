import type { NextFunction, Request, Response } from "express";

/** /mcp 엔드포인트 전용 — Authorization: Bearer {MCP_SERVER_AUTH_TOKEN} 검증. */
export function bearerAuth(req: Request, res: Response, next: NextFunction) {
  const token = process.env.MCP_SERVER_AUTH_TOKEN;
  if (!token) {
    res
      .status(500)
      .json({ error: "MCP_SERVER_AUTH_TOKEN이 서버에 설정되지 않았습니다." });
    return;
  }

  const header = req.header("authorization");
  if (header !== `Bearer ${token}`) {
    res.status(401).json({ error: "인증에 실패했습니다." });
    return;
  }

  next();
}
