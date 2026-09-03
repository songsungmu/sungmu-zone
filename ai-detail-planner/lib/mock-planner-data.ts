import type { EdgeCase, PlannerState, Policy, Requirement } from "@/types/planner";

const mockRequirements: Requirement[] = [
  {
    id: "FR-01",
    title: "영수증 등록",
    description: "사용자는 영수증 이미지를 등록할 수 있다.",
    type: "기능",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "FR-02",
    title: "영수증 정보 인식",
    description: "등록된 영수증에서 구매일, 구매 금액, 매장 정보를 자동 인식한다.",
    type: "기능",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "FR-03",
    title: "적립 가능 여부 검증",
    description: "구매일 및 회원 정보를 기준으로 적립 가능 여부를 검증한다.",
    type: "기능",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "FR-04",
    title: "포인트 적립",
    description: "검증이 통과된 경우 포인트를 적립한다.",
    type: "기능",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "FR-05",
    title: "적립 내역 확인",
    description: "사용자는 사후 적립 신청 내역을 확인할 수 있다.",
    type: "기능",
    status: "ai_suggested",
    source: "inferred",
  },
];

const mockPolicies: Policy[] = [
  {
    id: "PL-01",
    policyName: "적립 가능 기간",
    content: "구매 후 30일 이내",
    status: "confirmed",
    rationale: "서비스 정책",
    source: "inferred",
  },
  {
    id: "PL-02",
    policyName: "중복 적립 제한",
    content: "동일 영수증 1회만 적립 가능",
    status: "confirmed",
    rationale: "서비스 정책",
    source: "inferred",
  },
  {
    id: "PL-03",
    policyName: "적립 대상",
    content: "로그인 회원",
    status: "confirmed",
    rationale: "서비스 정책",
    source: "inferred",
  },
  {
    id: "PL-04",
    policyName: "적립 제외",
    content: "환불 완료 거래는 적립 제외",
    status: "confirmed",
    rationale: "서비스 정책",
    source: "inferred",
  },
  {
    id: "PL-05",
    policyName: "적립 한도",
    content: "1회 최대 10,000P",
    status: "confirmed",
    rationale: "서비스 정책",
    source: "inferred",
  },
];

const mockEdgeCases: EdgeCase[] = [
  {
    id: "EC-01",
    situation: "OCR 실패",
    handling: "영수증 인식 불가 → 재촬영 요청",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "EC-02",
    situation: "기간 초과",
    handling: "구매 후 30일 초과 → 적립 불가 안내",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "EC-03",
    situation: "중복 적립 시도",
    handling: "동일 영수증 재등록 → 적립 차단 안내",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "EC-04",
    situation: "환불 완료 거래",
    handling: "환불 완료 → 적립 불가 안내",
    status: "ai_suggested",
    source: "inferred",
  },
  {
    id: "EC-05",
    situation: "부분 취소",
    handling: "일부 상품 환불 → 정책 확인 필요",
    status: "ai_suggested",
    source: "inferred",
  },
];

export const initialPlannerState: PlannerState = {
  input: {
    functionName: "영수증 사후적립",
    requirementDraft:
      "구매 후 포인트가 누락된 사용자가 영수증을 통해 사후 적립할 수 있도록 지원",
    target: "로그인 회원",
    goal: "미적립 관련 CS 문의 감소",
    referenceDocText: "",
  },
  requirements: mockRequirements,
  policies: mockPolicies,
  edgeCases: mockEdgeCases,
  loadingStage: "idle",
};
