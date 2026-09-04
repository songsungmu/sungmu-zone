# AI Detail Planner

PM이 상위 기획(기능명, 요구사항 초안, 타겟, 목표)을 입력하면 AI가 ① 상세 요구사항
→ ② 세부 정책 → ③ 예외처리 케이스를 순차적으로 생성해주는 AI PM Assistant입니다.
AI가 기획을 대신하는 것이 아니라, PM이 상세기획을 진행하기 전에 놓치기 쉬운 정책과
예외 케이스를 선제적으로 검토할 수 있도록 돕는 것이 목표입니다.

## 로컬 실행 방법

```bash
git clone <repository-url>
cd ai-detail-planner
npm install
cp .env.local.example .env.local   # 아래 "환경변수" 참고해 값 채우기
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## 환경변수

| 변수명 | 설명 | 발급 방법 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | AI 생성(상세 요구사항/세부 정책/예외처리 케이스, 컬럼별 추가 입력)에 사용하는 Anthropic API 키. 서버 사이드(`app/api/*`)에서만 사용되며 클라이언트에 노출되지 않습니다. | [Anthropic Console → API Keys](https://console.anthropic.com/settings/keys)에서 발급 |

`.env.local`은 `.gitignore`에 의해 커밋되지 않습니다. 템플릿은 `.env.local.example`을 참고하세요.

## 기술 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- `@anthropic-ai/sdk` (서버 API route에서만 호출)

## 배포

Vercel에 배포할 경우 프로젝트 설정의 Environment Variables에 `ANTHROPIC_API_KEY`를
등록해야 합니다. 자세한 값/범위는 배포 담당자에게 별도 안내된 체크리스트를 참고하세요.
