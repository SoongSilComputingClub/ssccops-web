/** 더미데이터 기준일 — 실제 시계를 쓰면 D-day 시맨틱이 어긋나므로 고정 */
export const TODAY = "2026-08-09";

/**
 * CSV 이관 매핑 대상 시스템 필드 — mbr 테이블 컬럼ID 기준.
 * value가 실제 컬럼ID이고 label은 컬럼명(한글)이다.
 */
export const CSV_FIELDS = [
  { value: "", label: "매핑 안함" },
  { value: "stdntNo", label: "학생_번호" },
  { value: "genNo", label: "기수_번호" },
  { value: "mbrNm", label: "회원_명" },
  { value: "scsbjtNm", label: "학과_명" },
  { value: "scyrNo", label: "학년_번호" },
  { value: "telno", label: "전화번호" },
  { value: "eml", label: "이메일" },
  { value: "mbrGrdCd", label: "회원_등급_코드" },
  { value: "mbrSttsCd", label: "회원_상태_코드" },
  { value: "joinYmd", label: "가입_일자" },
] as const;

/** 폼 빌더 입력 형식 검증 프리셋 — form.qitem_cpst_cn 의 ptrnCn/ptrnNm 에 저장된다 */
export const PATTERN_PRESETS = [
  { name: "자유 입력", pattern: "" },
  { name: "이메일", pattern: "^[^@\\s]+@[^@\\s]+\\.[a-zA-Z]{2,}$" },
  { name: "휴대전화", pattern: "^01[016-9]-[0-9]{3,4}-[0-9]{4}$" },
  { name: "숫자만", pattern: "^[0-9]+$" },
  { name: "학번(9자리)", pattern: "^[0-9]{9}$" },
] as const;
