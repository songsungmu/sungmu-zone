# AI PM Policy Agent

PM이 Figma 화면설계서를 기준으로, Claude가 회사 정책 시트(Google Sheet)와
비교하여 상세 요구사항·세부 정책·예외처리 케이스를 분석하는 도구다.
분석 결과는 리뷰 리스트에 표시되고, PM이 항목 하나하나를 검토·승인하면
Google Sheet 정책 문서에 실제로 반영된다.

**핵심 안전 원칙**: 정책을 Google Sheet에 실제로 반영하는 로직은 AI(Claude
채팅)의 도구 호출 경로와 절대 연결되어 있지 않다. 오직 사용자가 리뷰
리스트에서 개별 항목의 [승인] 버튼을 클릭했을 때만 실행되는 별도 REST
엔드포인트(`app/api/policies/*`)에서 처리한다. 자세한 내용은
[`CLAUDE.md`](./CLAUDE.md) 참고.

## 구성

이 저장소는 두 개의 독립 배포 단위로 이루어져 있다.

| 디렉토리 | 역할 | 배포 대상 |
|---|---|---|
| (루트) | Next.js 앱 — 워크스페이스 UI + 승인 REST 엔드포인트 + Supabase 영속화 | Vercel |
| `mcp-server/` | 원격 MCP 서버 — Figma/Sheet 읽기 전용 조회 + 분석 도구 (자세한 내용은 [`mcp-server/README.md`](./mcp-server/README.md)) | Railway/Render |

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 값 채우기 (아래 환경변수 표 참고)
npm run dev
```

`mcp-server/`는 별도 프로세스다 — 별도 터미널에서
`cd mcp-server && npm install && npm run dev`로 띄운다.

## 환경변수 — Vercel(메인 앱)

Vercel 프로젝트의 Environment Variables에 아래를 전부 등록한다
(`NEXT_PUBLIC_` 접두사가 없는 값은 전부 서버 전용이며 클라이언트에
노출되지 않는다).

| 변수 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 키. `app/api/chat/route.ts`에서 `mcp-client-2025-11-20` 베타로 MCP Connector를 호출할 때 쓴다 |
| `MCP_SERVER_URL` | 배포된 mcp-server의 `/mcp` 엔드포인트 전체 URL (예: `https://<project>.up.railway.app/mcp`) |
| `MCP_SERVER_AUTH_TOKEN` | mcp-server의 `MCP_SERVER_AUTH_TOKEN`과 **동일한 값**. `/mcp` 요청 인증에 쓴다 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 정책 시트 읽기+쓰기용 서비스 계정 이메일 (mcp-server는 같은 계정을 읽기 전용 스코프로만 쓴다) |
| `GOOGLE_PRIVATE_KEY` | 위 서비스 계정의 private key. Vercel 대시보드에 여러 줄 그대로 붙여넣어도 되고, 한 줄로 `\n` 이스케이프해서 넣어도 된다 — 코드(`lib/core/googleAuth.ts`)가 `\n`을 실제 개행으로 정규화하므로 둘 다 정상 동작한다 |
| `GOOGLE_SHEET_ID` | 정책이 저장된 Google Sheet ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (서버 전용 — `NEXT_PUBLIC_` 접두사가 없으므로 클라이언트에 노출되지 않는다) |

Supabase를 쓰려면 배포 전에 `supabase/migrations/0001_init.sql`을 해당
프로젝트에 적용해야 한다(Supabase 대시보드 SQL editor에 붙여넣거나
`supabase db push`). 적용 전에는 분석/승인 자체는 정상 동작하지만
새로고침 후 복원과 영향도 분석(`get_change_impact`)은 동작하지 않는다
(베스트에포트로 설계되어 있어 에러 없이 조용히 건너뛴다).

## 환경변수 — Railway/Render(mcp-server)

mcp-server가 필요로 하는 환경변수와 배포 절차 전체는
[`mcp-server/README.md`](./mcp-server/README.md)에 정리되어 있다. 요약:

| 변수 | 설명 |
|---|---|
| `MCP_SERVER_AUTH_TOKEN` | 위 Vercel 쪽과 동일한 값 |
| `FIGMA_ACCESS_TOKEN` | Figma Personal Access Token |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_SHEET_ID` | Vercel 쪽과 동일한 값(같은 시트를 읽기 전용으로 조회) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | `get_change_impact`가 trace_links를 읽기 전용으로 조회할 때 쓴다. `SUPABASE_URL`은 Vercel의 `NEXT_PUBLIC_SUPABASE_URL`과 같은 프로젝트 URL이면 된다 |

## 배포 순서

1. Google Sheets 서비스 계정을 만들고 정책 시트에 편집자로 초대한다.
2. Supabase 프로젝트를 만들고 `supabase/migrations/0001_init.sql`을 적용한다.
3. mcp-server를 Railway 또는 Render에 먼저 배포한다([`mcp-server/README.md`](./mcp-server/README.md) 참고) — `/healthz`로 기동을 확인하고 `/mcp` URL을 확보한다.
4. Vercel에 메인 앱을 배포하면서, 위 표의 환경변수를 전부 등록한다(`MCP_SERVER_URL`에 3번에서 확보한 URL을 넣는다).
5. `/workspace`에서 Figma 연결 → 정책 검토 → 리뷰 리스트 → 개별 승인 → 시트 반영까지 한 번 전체 플로우를 실행해 확인한다.

## Learn More

Next.js 자체에 대해서는 [Next.js Documentation](https://nextjs.org/docs)을
참고한다.
