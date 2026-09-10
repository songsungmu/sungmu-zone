import type {
  AnalysisResult,
  ExceptionItem,
  PolicyConflict,
  PolicyItem,
  RequirementItem,
} from "@/types/review";

// 영수증 사후적립 화면설계서 × 적립 정책 시트를 비교 분석했다고 가정한 목업
// 데이터. 실제 Claude/MCP 연동은 이후 Phase에서 이 자리를 대체한다.

const mockRequirements: RequirementItem[] = [
  {
    id: "FR-01",
    title: "영수증 등록",
    description: "사용자는 영수증 이미지를 업로드할 수 있다.",
    sourceFrame: "Frame 3 · 영수증 업로드",
  },
  {
    id: "FR-02",
    title: "영수증 OCR 인식",
    description: "업로드된 영수증에서 구매일자·금액·매장명을 자동 인식한다.",
    sourceFrame: "Frame 3 · 영수증 업로드",
  },
  {
    id: "FR-03",
    title: "구매 정보 확인 화면",
    description: "인식된 구매 정보를 사용자가 확인·수정할 수 있다.",
    sourceFrame: "Frame 4 · 정보 확인",
  },
  {
    id: "FR-04",
    title: "사후 적립 신청 제출",
    description: "확인된 정보로 사후 적립을 신청할 수 있다.",
    sourceFrame: "Frame 4 · 정보 확인",
  },
  {
    id: "FR-05",
    title: "신청 내역 조회",
    description: "사용자는 본인의 사후 적립 신청 내역을 조회할 수 있다.",
    sourceFrame: "Frame 6 · 신청 내역",
  },
  {
    id: "FR-06",
    title: "신청 상태 표시",
    description: "신청 내역 화면에 접수·검토중·승인·반려 상태를 표시한다.",
    sourceFrame: "Frame 6 · 신청 내역",
  },
  {
    id: "FR-07",
    title: "반려 사유 안내",
    description: "반려된 신청 건에는 반려 사유를 함께 표시한다.",
    sourceFrame: "Frame 6 · 신청 내역",
  },
  {
    id: "FR-08",
    title: "재신청",
    description: "반려된 건은 같은 화면에서 재신청할 수 있다.",
  },
  {
    id: "FR-09",
    title: "처리 결과 알림 수신",
    description: "신청 처리 결과를 푸시 알림으로 받을 수 있다.",
    sourceFrame: "Frame 8 · 알림 설정",
  },
  {
    id: "FR-10",
    title: "알림 수신 거부",
    description: "사용자는 사후 적립 알림 수신을 거부할 수 있다.",
    sourceFrame: "Frame 8 · 알림 설정",
  },
  {
    id: "FR-11",
    title: "영수증 삭제",
    description: "등록한 영수증 이미지를 삭제할 수 있다.",
  },
  {
    id: "FR-12",
    title: "다중 영수증 업로드",
    description: "한 번에 최대 3장의 영수증을 업로드할 수 있다.",
    sourceFrame: "Frame 3 · 영수증 업로드",
  },
  {
    id: "FR-13",
    title: "적립 예상 포인트 표시",
    description: "신청 전 예상 적립 포인트를 미리 보여준다.",
    sourceFrame: "Frame 4 · 정보 확인",
  },
  {
    id: "FR-14",
    title: "로그인 필수 접근",
    description: "비로그인 사용자는 사후 적립 메뉴에 접근할 수 없다.",
  },
  {
    id: "FR-15",
    title: "고객센터 연결",
    description: "신청 내역 화면에서 고객센터 문의로 바로 연결할 수 있다.",
    sourceFrame: "Frame 6 · 신청 내역",
  },
  {
    id: "FR-16",
    title: "매장 검색",
    description: "매장명 인식 실패 시 직접 검색해 선택할 수 있다.",
    sourceFrame: "Frame 4 · 정보 확인",
  },
  {
    id: "FR-17",
    title: "약관 동의",
    description: "최초 신청 시 사후 적립 이용 약관에 동의해야 한다.",
  },
  {
    id: "FR-18",
    title: "처리 기한 안내",
    description: "신청 후 예상 처리 기한을 안내한다.",
    sourceFrame: "Frame 6 · 신청 내역",
  },
];

const mockPolicies: PolicyItem[] = [
  // confirmed (6)
  {
    id: "PL-01",
    title: "적립 가능 기간",
    content: "구매 후 30일 이내 건만 사후 적립 신청이 가능하다.",
    classification: "confirmed",
    sourceType: "company_sheet",
  },
  {
    id: "PL-02",
    title: "중복 적립 제한",
    content: "동일 영수증으로는 1회만 적립 신청이 가능하다.",
    classification: "confirmed",
    sourceType: "company_sheet",
  },
  {
    id: "PL-03",
    title: "적립 대상",
    content: "로그인 회원만 사후 적립을 신청할 수 있다.",
    classification: "confirmed",
    sourceType: "company_sheet",
  },
  {
    id: "PL-04",
    title: "적립 제외 거래",
    content: "환불이 완료된 거래는 적립 대상에서 제외한다.",
    classification: "confirmed",
    sourceType: "company_sheet",
  },
  {
    id: "PL-05",
    title: "처리 기한",
    content: "신청 접수 후 영업일 기준 5일 이내에 처리한다.",
    classification: "confirmed",
    sourceType: "company_sheet",
  },
  {
    id: "PL-06",
    title: "다중 업로드 제한",
    content: "1회 신청당 영수증은 최대 3장까지 첨부할 수 있다.",
    classification: "confirmed",
    sourceType: "company_sheet",
  },
  // suggested (5)
  {
    id: "PL-07",
    title: "적립 한도",
    content: "1회 신청당 최대 10,000P까지 적립 가능하도록 제안합니다.",
    classification: "suggested",
    sourceType: "ai_suggested",
    rationale: "과도한 적립 어뷰징 방지를 위해 상한이 필요해 보입니다.",
  },
  {
    id: "PL-08",
    title: "재신청 제한",
    content: "동일 건이 반려된 후 재신청은 최대 2회까지로 제안합니다.",
    classification: "suggested",
    sourceType: "ai_suggested",
    rationale: "무한 재신청으로 인한 검토 부담을 줄이기 위함입니다.",
  },
  {
    id: "PL-09",
    title: "매장 검색 결과 정렬 기준",
    content: "매장 직접 검색 시 결과를 거리순으로 정렬하도록 제안합니다.",
    classification: "suggested",
    sourceType: "ai_suggested",
    rationale: "화면설계서에 정렬 기준이 명시되어 있지 않아 추론했습니다.",
  },
  {
    id: "PL-10",
    title: "알림 재발송 주기",
    content: "미확인 알림은 24시간 후 1회 재발송하도록 제안합니다.",
    classification: "suggested",
    sourceType: "ai_suggested",
    rationale: "처리 결과를 놓치는 사용자를 줄이기 위함입니다.",
  },
  {
    id: "PL-11",
    title: "약관 재동의 주기",
    content: "약관이 변경된 경우에만 재동의를 요구하도록 제안합니다.",
    classification: "suggested",
    sourceType: "ai_suggested",
    rationale: "매 신청마다 재동의를 요구하면 이탈이 늘어날 수 있습니다.",
  },
  // need_decision (3)
  {
    id: "PL-12",
    title: "적립 포인트 계산 기준",
    content:
      "화면설계서엔 \"구매 금액의 1%\"로 표기되어 있으나, 정책 시트엔 계산 기준이 없습니다.",
    classification: "need_decision",
    sourceType: "ai_suggested",
    rationale: "기준을 정하지 않으면 실제 적립 로직을 구현할 수 없습니다.",
  },
  {
    id: "PL-13",
    title: "영수증 이미지 보관 기간",
    content:
      "화면설계서엔 언급이 없고, 정책 시트엔 \"1년 보관 후 삭제\"로 되어 있습니다.",
    classification: "need_decision",
    sourceType: "ai_suggested",
    rationale: "개인정보 보관 기간과 직결되어 확정이 필요합니다.",
  },
  {
    id: "PL-14",
    title: "고객센터 연결 방식",
    content:
      "화면설계서엔 \"채팅 상담\"으로, 정책 시트엔 \"전화 상담\"으로 서로 다르게 되어 있습니다.",
    classification: "need_decision",
    sourceType: "ai_suggested",
    rationale: "연결 방식에 따라 필요한 개발 범위가 달라집니다.",
  },
];

const mockExceptions: ExceptionItem[] = [
  {
    id: "EC-01",
    situation: "OCR 인식 실패",
    handling: "영수증 인식 불가 → 재촬영 요청",
    category: "system",
  },
  {
    id: "EC-02",
    situation: "서버 통신 오류",
    handling: "재시도 안내 후 입력 내용 임시 저장",
    category: "system",
  },
  {
    id: "EC-03",
    situation: "이미지 업로드 용량 초과",
    handling: "10MB 이하 파일로 업로드하도록 안내",
    category: "system",
  },
  {
    id: "EC-04",
    situation: "적립 가능 기간(30일) 초과",
    handling: "신청 불가 안내 메시지 노출",
    category: "policy",
  },
  {
    id: "EC-05",
    situation: "동일 영수증 재신청",
    handling: "기존 신청 건 안내 후 재신청 차단",
    category: "policy",
  },
  {
    id: "EC-06",
    situation: "환불 완료된 거래",
    handling: "적립 불가 안내 메시지 노출",
    category: "policy",
  },
  {
    id: "EC-07",
    situation: "비로그인 상태로 접근",
    handling: "로그인 화면으로 이동",
    category: "user",
  },
  {
    id: "EC-08",
    situation: "약관 미동의 상태로 신청 시도",
    handling: "신청 진행을 막고 약관 동의 화면 노출",
    category: "user",
  },
  {
    id: "EC-09",
    situation: "필수 입력 정보 누락",
    handling: "제출 버튼 비활성화 및 누락 항목 강조",
    category: "user",
  },
  {
    id: "EC-10",
    situation: "영수증 금액이 0원 또는 음수로 인식됨",
    handling: "유효하지 않은 금액으로 처리, 제출 차단",
    category: "boundary",
  },
  {
    id: "EC-11",
    situation: "영수증 4장 이상 업로드 시도",
    handling: "최대 3장까지만 가능하다고 안내",
    category: "boundary",
  },
];

const mockConflicts: PolicyConflict[] = [
  {
    id: "CF-01",
    title: "포인트 계산 기준 불일치",
    existingPolicy: "정책 시트: 별도 계산 기준 없음 (운영자 수동 산정)",
    newPolicy: "화면설계서: 구매 금액의 1%를 자동 계산",
  },
  {
    id: "CF-02",
    title: "영수증 보관 기간 불일치",
    existingPolicy: "정책 시트: 1년 보관 후 자동 삭제",
    newPolicy: "화면설계서: 보관 기간 관련 언급 없음",
  },
];

export function createMockAnalysisResult(): AnalysisResult {
  return {
    requirements: mockRequirements,
    policies: mockPolicies,
    exceptions: mockExceptions,
    conflicts: mockConflicts,
    summary: `정책 ${mockPolicies.length}건을 분석했어요. 아래 리스트에서 확인해 주세요. (목업 응답)`,
    generatedAt: new Date().toISOString(),
  };
}
