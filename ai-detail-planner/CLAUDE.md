@AGENTS.md

# AI Detail Planner — CLAUDE.md

## 프로젝트 목적

PM이 상위 기획(기능명, 요구사항 초안, 타겟, 목표)을 입력하면, AI가 3단계로
① 상세 요구사항 → ② 세부 정책 → ③ 예외처리 케이스를 순차적으로 생성해주는
AI PM Assistant 웹 도구입니다. AI가 기획을 대신하는 것이 아니라, PM이 상세기획을
진행하기 전에 필요한 정책·예외 케이스를 선제적으로 검토할 수 있도록 가이드를
제공하는 것이 목표입니다.

## 기술 스택 요약

- Next.js 14+ (App Router), TypeScript
- Tailwind CSS (v4) + shadcn/ui (컴포넌트는 CLI 대신 수동으로 추가됨 — 이 환경의
  네트워크 정책상 ui.shadcn.com에 접근 불가하기 때문. 필요한 컴포넌트는
  `components/ui/`에 표준 shadcn 소스를 직접 작성)
- AI 연동: Anthropic API (`@anthropic-ai/sdk`)
- 배포 목표: Vercel
- 상태관리: 별도 라이브러리 없이 React 기본 state (필요 시 이후 추가)
- DB 없음 — v1은 세션 내 메모리 상태로만 동작하며, 새로고침 시 초기화되는 것을 허용

## 필수 규칙

- **API 키는 절대 클라이언트 컴포넌트나 프론트엔드 코드에 노출하지 않는다.**
  모든 AI 호출은 `app/api/` 하위의 서버 route handler에서만 수행한다.
- **`git push --force`, `git reset --hard` 등 destructive 명령어는 명시적 승인
  없이 실행하지 않는다.**
- 함수형 컴포넌트만 사용하며, named export를 우선한다.
- **새 기능을 만들기 전엔 먼저 계획을 텍스트로 설명하고 승인받은 후 코드를
  작성한다.**

## 참고

- 이 프로젝트는 `AGENTS.md`가 명시하는 대로 Next.js 최신 버전(학습 데이터와
  다를 수 있는 breaking changes 포함)을 사용한다. 새 API를 쓰기 전
  `node_modules/next/dist/docs/`의 관련 가이드를 확인한다.
- `.env.local`은 커밋하지 않는다. 필요한 환경 변수는 `.env.local.example`에
  키 이름만 기록한다.
