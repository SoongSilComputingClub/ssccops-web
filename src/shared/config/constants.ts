/** 더미데이터 기준일 — 실제 시계를 쓰면 D-day·캘린더 시맨틱이 어긋나므로 고정 */
export const TODAY = "2026-08-09";

/** 캘린더 연도 (원본 하드코딩) */
export const CAL_YEAR = 2026;

/** 하위 업무 단계 */
export const STAGES = ["기획", "진행", "검토", "완료"] as const;

/** 회의 안건 구분 */
export const AG_KINDS = ["논의", "결정", "보고"] as const;

/** 폼 문항 유형 */
export const QTYPES = ["단답형", "장문형", "단일선택", "다중선택", "날짜"] as const;
export const CHOICE_TYPES = ["단일선택", "다중선택"] as const;

export function isChoiceType(t: string): boolean {
  return (CHOICE_TYPES as readonly string[]).includes(t);
}

/** 하위 업무 유형의 승인자 역할 후보 */
export const OT_ROLES = ["회장", "부회장", "총무", "국장", "-"] as const;

/** 소셜 로그인 제공자 (내 계정 탭 고정 순서) */
export const PROVIDERS = ["GOOGLE", "GITHUB", "NAVER", "KAKAO"] as const;

/** CSV 매핑 대상 시스템 필드 */
export const CSV_FIELDS = [
  "매핑 안함",
  "학생번호",
  "기수번호",
  "회원명",
  "학과명",
  "학년번호",
  "연락처번호",
  "이메일주소",
  "회원등급",
  "회원상태",
  "가입일자",
] as const;

/** 폼 빌더 입력 형식 검증 프리셋 */
export const PATTERN_PRESETS = [
  { name: "자유 입력", pattern: "" },
  { name: "이메일", pattern: "^[^@\\s]+@[^@\\s]+\\.[a-zA-Z]{2,}$" },
  { name: "휴대전화", pattern: "^01[016-9]-[0-9]{3,4}-[0-9]{4}$" },
  { name: "숫자만", pattern: "^[0-9]+$" },
  { name: "학번(9자리)", pattern: "^[0-9]{9}$" },
] as const;
