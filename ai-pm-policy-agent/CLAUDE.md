@AGENTS.md

# AI PM Policy Agent — CLAUDE.md

## 프로젝트 목적

PM이 Figma 화면설계서를 기준으로, Claude가 회사 정책 시트(Google Sheet)와
비교하여 상세 요구사항·세부 정책·예외처리 케이스를 분석하는 도구입니다.
분석 결과는 화면 하단에 개별 항목 리스트로 표시되고, PM이 항목 하나하나를
검토·승인하면 Google Sheet 정책 문서에 반영됩니다.

## 기술 스택 요약

- Next.js 16+ (App Router), TypeScript
- Tailwind CSS (v4) + shadcn/ui (컴포넌트는 CLI 대신 수동으로 추가됨 — 이 환경의
  네트워크 정책상 ui.shadcn.com에 접근 불가하기 때문. 필요한 컴포넌트는
  `components/ui/`에 표준 shadcn 소스를 직접 작성)
- AI 연동: Anthropic API (`@anthropic-ai/sdk`), MCP Connector 베타 기능 사용
- DB: Supabase (Postgres) — 분석 결과 및 승인 이력 저장
- 정책 저장소: Google Sheets API (`googleapis`) — 읽기/쓰기
- 원격 MCP 서버: `mcp-server/` (별도 배포, 이후 Phase에서 구축)
- 배포 목표: Vercel

## 디자인 시스템

- **브랜드 컬러**: 파란색 계열 (`--primary` 토큰). Primary 버튼, 링크, 강조
  텍스트에 사용.
- **헤더**: 파란 사각형 shield 아이콘 로고 + "PM Agent" + "POLICY REVIEW
  CONSOLE" 서브타이틀. 우측에 인프라 상태 표시 + 버전 배지.
- **카드**: 흰 배경, 옅은 회색 테두리, 둥근 모서리(12px, `--radius-xl` 토큰).
- **상태 배지 4종**: `Badge`의 `confirmed`(초록) / `suggested`(파랑) /
  `need-decision`(주황) / `conflict`(빨강) variant만 사용한다. 이 4개
  색상 체계는 프로젝트 전체에서 일관되게 유지하며, 임의로 다른 색을
  섞어 쓰지 않는다. 색상 값은 `app/globals.css`의
  `--status-*`/`--color-status-*` 토큰에서만 관리한다.

## 필수 규칙

- **정책을 Google Sheet에 실제로 반영하는 로직은 AI(Claude 채팅)의 도구
  호출 경로와 절대 연결하지 않는다. 오직 사용자가 리뷰 리스트에서 개별
  항목의 [승인] 버튼을 클릭했을 때만 실행되는 별도 REST 엔드포인트에서
  처리한다.** Claude가 분석·제안하는 것과, 그 제안이 실제 정책 문서에
  쓰이는 것 사이에는 반드시 사람의 명시적 승인 클릭이 있어야 한다. MCP
  도구 정의에 Google Sheet 쓰기 권한을 절대 포함시키지 않는다.
- **모든 외부 API 키/토큰은 서버 사이드 전용이며, 클라이언트 코드에
  노출하지 않는다.** `ANTHROPIC_API_KEY`, `MCP_SERVER_AUTH_TOKEN`,
  `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PRIVATE_KEY` 등은 `app/api/` 하위의
  서버 route handler(또는 서버 컴포넌트)에서만 참조한다. `NEXT_PUBLIC_`
  접두사가 붙지 않은 환경 변수를 클라이언트 컴포넌트에서 절대 import하지
  않는다.
- **함수형 컴포넌트만 사용하며, named export를 우선한다.**
- **`git push --force`, `git reset --hard` 등 destructive 명령어는 명시적
  승인 없이 실행하지 않는다.**
- **새 기능을 만들기 전엔 먼저 계획을 텍스트로 설명하고 승인받은 후 코드를
  작성한다.**

## 참고

- 이 프로젝트는 `AGENTS.md`가 명시하는 대로 Next.js 최신 버전(학습 데이터와
  다를 수 있는 breaking changes 포함)을 사용한다. 새 API를 쓰기 전
  `node_modules/next/dist/docs/`의 관련 가이드를 확인한다.
- `.env.local`은 커밋하지 않는다. 필요한 환경 변수는 `.env.local.example`에
  키 이름만 기록한다.
- Anthropic API/모델 관련 코드를 작성하거나 수정할 때는 `claude-api` 스킬을
  먼저 확인한다 (모델 ID, MCP Connector 사용법 등은 학습 데이터 시점과
  다를 수 있음).
