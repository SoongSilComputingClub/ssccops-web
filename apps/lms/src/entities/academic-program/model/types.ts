/*
 * 학술 팀원 도메인 타입 (#131 · ssccops-server#138).
 *
 * 이 앱(apps/lms)의 학술 도메인은 이 화면이 처음 여는 슬라이스라, 어드민
 * `entities/academic-program`과 이름은 같지만 소스를 공유하지 않는다(FSD 레이어는 세 앱이
 * 각자 갖는다 — AGENTS.md). 지금 필요한 것은 팀원 목록 하나뿐이므로 그 타입만 둔다 —
 * 활동 상세·목록·전이는 어드민(학술국장용) 몫이다.
 *
 * 서버 응답의 실제 모양을 아는 곳은 `entities/academic-program/api` 하나이고 화면은 이
 * 타입만 본다(폼·행사 도메인이 세운 규칙).
 */

/**
 * 참가_상태 (event_ptcp.ptcp_stts_cd).
 *
 * 팀원 명단의 상태 세 값 — 어드민 `shared/config/codes.ts`의 `PtcpSttsCd`와 같은 계약이다.
 * lms에는 아직 공유 `codes.ts`가 없어(apps/www도 슬라이스마다 코드를 두는 방식이다) 여기에
 * 둔다. **거절(REJECTED)이 없다** — 거절은 신청(폼 응답) 심사 결과라 명단에는 오르지 않는다.
 * 취소(CANCELLED)도 행을 지우는 대신 남기는 상태다(명단은 활동 이력으로 보존).
 */
export type PtcpSttsCd = "CONFIRMED" | "WAITLISTED" | "CANCELLED";

/**
 * table: event_ptcp — 활동에 확정·대기 중인 팀원 한 줄 (`AcademicProgramMemberResponse`).
 *
 * `GET /v1/academic-programs/{id}/members`는 신규 테이블 없이 `event_ptcp`를 학술관리
 * 컨텍스트에서 그대로 프록시한다.
 *
 * ── 응답에 없는 값은 만들지 않는다 (#131 결정) ────────────────
 * 프로토타입 표에는 학번·출석률 열이 있으나 서버가 주지 않는다. 없는 값을 채워 넣지 않는다는
 * 규칙이라 도메인 타입에도 그 필드를 두지 않는다 — 필요하면 서버에 필드 추가를 먼저 요청한다.
 */
export interface AcademicProgramMember {
  /**
   * event_ptcp.event_ptcp_id · PK.
   *
   * **이 화면의 핵심 산출물이다.** 회차 기록의 출석 배열(#128)이 `mbrId`가 아니라 이 값을
   * 보낸다 — 화면이 팀원을 가리킬 때 쓰는 식별자는 회원 PK가 아니라 참가 PK다.
   */
  eventPtcpId: number;
  /** mbr_id · 회원 PK */
  memberId: number;
  /** 회원 이름. 서버가 비워 보내면 빈 문자열로 굳힌다(표시 규칙은 뷰가 정한다) */
  memberName: string;
  /** 참가_상태 — CONFIRMED·WAITLISTED·CANCELLED */
  ptcpSttsCd: PtcpSttsCd;
  /**
   * 이 팀원이 스터디장/팀장인가 — **서버 판정**(재계산 금지).
   *
   * `leadrMbrId === mbrId`를 웹에서 다시 계산하지 않는다(AGENTS.md "역할을 웹에서 다시
   * 계산하지 않는다" 원칙). 역할 배지는 이 값으로만 "스터디장"/"팀원"을 가른다.
   */
  isLeader: boolean;
  /**
   * 합류(참가 확정) 일시. 서버가 Asia/Seoul 오프셋을 붙여 내려준다
   * ("2026-03-01T00:00:00+09:00"). 화면은 앞자리를 잘라 쓴다 — `new Date()`로 파싱해
   * 로컬 시간대로 그리면 서울 밖에서 다른 날짜가 보인다. 값이 없으면 null.
   */
  joinedAt: string | null;
}

/** 팀원 목록 필터 — 값이 없으면(null) 상태로 거르지 않고 전원을 받는다 */
export interface AcademicProgramMemberFilter {
  ptcpSttsCd?: PtcpSttsCd | null;
}
