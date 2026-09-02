import type { SesnSttsCd } from "@/shared/config/codes";

/**
 * table: crclm_artcl — 커리큘럼 항목 (회차별 계획) · #122
 *
 * 계획(crclm_artcl) + 실적(sesn) 조인 한 줄이다. 활동 상세 화면의 "커리큘럼 대비 진행"
 * 표가 이 배열 하나로 그려진다(GET /v1/academic-programs/{id}/curriculum-items ·
 * CurriculumItemWithSessionResponse).
 *
 * 커리큘럼은 승인 이관(#150) 시점에 한 번 만들어지고 이후 불변이라 등록·수정·삭제
 * 핸들러가 없다 — 이 도메인은 조회 타입만 갖는다.
 *
 * ── 서버가 채우는 것과 비우는 것 ─────────────────────────────
 * `sesnSttsCd`는 실적 행이 없어도 NOT_SUBMITTED 로 채워 내려온다 — 화면이 null 분기를
 * 두지 않게 하려는 것이다. 반대로 `sessionId`·`actualYmd`·`progressContent`는 실적이
 * 있을 때만 채운다(없는 것을 있는 척하지 않는다). `isEditable`도 서버가 판정한다 —
 * 스터디장/팀장 본인 여부와 회차 상태(allowsRecording)의 곱이라, 웹이
 * leaderMemberId === 내 mbrId 를 다시 계산하면 버튼과 실제 판정이 갈린다(#122).
 *
 * 날짜는 서버가 LocalDate("2026-03-01")로 내려준다 — 일시가 아니라 일자다.
 */
export interface CurriculumItemWithSession {
  /** crclm_artcl_id · PK */
  curriculumItemId: number;
  /** 회차 순번 (1부터) */
  seqno: number | null;
  /** 제목 (ttl) */
  title: string;
  /** 계획일 (planYmd — 옛 planDt). YYYY-MM-DD */
  planYmd: string | null;
  /** 실적 행의 PK. 아직 아무도 손대지 않은 계획이면 null */
  sessionId: number | null;
  /** 회차 실적 상태. 실적이 없으면 서버가 NOT_SUBMITTED 를 합성해 내려준다 */
  sesnSttsCd: SesnSttsCd;
  /** 실제 진행일 (actlYmd — 옛 realDt). 실적이 있을 때만. YYYY-MM-DD */
  actualYmd: string | null;
  /** 회차 진행 내용 (prgrsCn — 옛 cn). 실적이 있을 때만 */
  progressContent: string | null;
  /** 지금 이 회차의 기록을 쓸 수 있는가 — 서버 판정(본인 여부 × 상태). 재계산 금지 */
  isEditable: boolean;
}
