/** 더미데이터 기준일 — 실제 시계를 쓰면 D-day 시맨틱이 어긋나므로 고정 */
export const TODAY = "2026-08-09";

/*
 * CSV 이관 매핑 대상 필드(`CSV_FIELDS`)가 있던 자리다 (#57).
 *
 * 목록의 근거가 데이터사전이 아니라 **서버의 `MemberImportField`**여서 entities/member로 옮겼다
 * — 여기 있는 동안에는 서버가 받지 않는 값을 화면이 고르게 둘 수 있었고(반대로 서버가 필드를
 * 늘려도 화면은 몰랐고), 매핑이 필수인 셋(회원명·등급·상태)이라는 사실도 담을 자리가 없었다.
 * 표시 이름도 컬럼ID('회원_명')가 아니라 사람이 읽는 이름('회원명')으로 바뀌었다.
 */

/** 폼 빌더 입력 형식 검증 프리셋 — form.qitem_cpst_cn 의 ptrnCn/ptrnNm 에 저장된다 */
export const PATTERN_PRESETS = [
  { name: "자유 입력", pattern: "" },
  { name: "이메일", pattern: "^[^@\\s]+@[^@\\s]+\\.[a-zA-Z]{2,}$" },
  { name: "휴대전화", pattern: "^01[016-9]-[0-9]{3,4}-[0-9]{4}$" },
  { name: "숫자만", pattern: "^[0-9]+$" },
  { name: "학번(9자리)", pattern: "^[0-9]{9}$" },
] as const;
