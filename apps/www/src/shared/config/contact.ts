/*
 * 문의처 — 푸터의 문의 블록이 그리는 값 (#520 · ssccops#382).
 *
 * 주소·SNS는 옛 사이트(SSCC-Web-FE `src/shared/layout/footer.tsx`)의 값을 그대로 옮겼다.
 * **메일 주소는 옛 사이트에도 없었다** — 값이 정해지면 `email`에 적는다. null이면 푸터가
 * 메일 줄을 그리지 않는다(없는 값을 지어내지 않는다).
 */
export const CONTACT = {
  /** 동방 위치 */
  address: "숭실대학교 학생회관 233호",
  /** 문의 메일 — 정해지지 않았다 */
  email: null as string | null,
  instagram: "https://www.instagram.com/sscc_ssu/",
  github: "https://github.com/SoongSilComputingClub",
} as const;
