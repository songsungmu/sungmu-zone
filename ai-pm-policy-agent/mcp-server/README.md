# AI PM Policy Agent — 원격 MCP 서버

Figma/Google Sheet 원본 데이터를 조회하고 규칙 기반으로 구조화해서
반환하는 **읽기/분석 전용** MCP 서버다. `/mcp` 하나의 StreamableHTTP
엔드포인트만 노출한다.

**이 서버는 어떤 도구도 Google Sheet에 값을 쓰지 않는다.** 정책을
실제로 시트에 반영하는 로직은 이 서버가 아니라, PM이 리뷰 리스트에서
[승인] 버튼을 눌렀을 때만 실행되는 별도 REST 엔드포인트(Phase 9,
Next.js 앱 쪽)에서 처리한다.

## 제공 도구 (6개, 전부 읽기/분석 전용)

| 도구 | 설명 |
|---|---|
| `get_figma_context` | Figma 파일 URL로 파일명/최상위 프레임 목록 조회 |
| `get_company_policies` | Google Sheet 기존 정책을 읽기 전용으로 조회 |
| `analyze_requirements` | Figma 프레임 + 프로젝트 설명 → 요구사항 후보 |
| `analyze_policies` | 요구사항 + 기존 정책 → 분류(confirmed/suggested/need_decision) + 충돌 목록 |
| `analyze_exceptions` | 요구사항 + 정책 → 예외처리 케이스(system/policy/user/boundary) |
| `get_change_impact` | Google Sheet Policy ID(POL-XXX)로 연결된 요구사항/정책/예외처리를 Supabase trace_links에서 조회 (Phase 10) |

## 로컬 실행

```bash
npm install
cp .env.example .env   # 값 채우기
npm run dev            # tsx watch, http://localhost:3100
```

빌드/실행:

```bash
npm run build
npm start
```

헬스체크: `GET /healthz` (인증 불필요, 배포 플랫폼의 헬스체크용).

## 환경변수

| 변수 | 설명 |
|---|---|
| `PORT` | 리슨 포트 (Railway/Render는 자체 `PORT`를 주입하므로 배포 환경에서는 보통 생략 가능) |
| `MCP_SERVER_AUTH_TOKEN` | `/mcp` 인증 토큰. Next.js 앱의 `MCP_SERVER_AUTH_TOKEN`과 동일한 값이어야 한다 |
| `FIGMA_ACCESS_TOKEN` | Figma Personal Access Token (읽기 전용 스코프) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google 서비스 계정 이메일 |
| `GOOGLE_PRIVATE_KEY` | 서비스 계정 private key (플랫폼 환경변수 입력 시 개행이 `\n`으로 이스케이프되는 경우가 많음 — 코드에서 자동 변환한다) |
| `GOOGLE_SHEET_ID` | 정책이 저장된 Google Sheet ID |
| `SUPABASE_URL` | `get_change_impact`가 trace_links 등을 읽기 전용으로 조회할 Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 위 Supabase 프로젝트의 서비스 롤 키 (읽기 전용 용도로만 사용) |

## 배포 — Railway

1. Railway 대시보드에서 **New Project → Deploy from GitHub repo** 선택,
   이 저장소를 연결한다.
2. **Root Directory**를 `ai-pm-policy-agent/mcp-server`로 지정한다
   (모노레포 내 서브 디렉토리이므로 반드시 설정).
3. Build/Start 커맨드는 Railway가 `package.json`의 `build`/`start`
   스크립트를 자동 인식한다 (`npm run build` → `npm start`).
4. **Variables** 탭에서 위 환경변수를 전부 등록한다. `PORT`는 Railway가
   자동 주입하므로 등록하지 않는다.
5. 배포 완료 후 생성된 퍼블릭 URL(`https://<project>.up.railway.app`)에
   `/mcp`를 붙인 값을 Next.js 앱의 `MCP_SERVER_URL`에 설정한다.
6. `GET https://<project>.up.railway.app/healthz`로 정상 기동을 확인한다.

## 배포 — Render

1. Render 대시보드에서 **New → Web Service**, 이 저장소를 연결한다.
2. **Root Directory**: `ai-pm-policy-agent/mcp-server`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Environment**: Node
6. **Environment Variables**에 위 환경변수를 전부 등록한다 (`PORT`는
   Render가 자동 주입).
7. 배포 완료 후 `https://<service>.onrender.com/mcp`를 Next.js 앱의
   `MCP_SERVER_URL`에 설정하고, `/healthz`로 정상 기동을 확인한다.

## 인증

`/mcp`의 모든 요청(POST/GET/DELETE)은
`Authorization: Bearer {MCP_SERVER_AUTH_TOKEN}` 헤더를 검증한다.
토큰이 없거나 일치하지 않으면 401을 반환한다. `/healthz`는 인증 없이
접근 가능하다.

## 세션 모드

`StreamableHTTPServerTransport`를 `sessionIdGenerator: undefined`로
stateless 모드로 사용한다. 요청마다 새 `McpServer`/`transport`를 만들고
응답이 끝나면 정리하므로, 서버 프로세스가 여러 인스턴스로 스케일아웃돼도
세션 상태 문제가 없다.
