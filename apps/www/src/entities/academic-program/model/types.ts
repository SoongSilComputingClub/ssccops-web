/*
 * 학술 활동 도메인 타입 — `/me`의 «내가 이끄는 스터디·프로젝트» 블록이 쓴다 (#518 · ssccops#386).
 *
 * lms `entities/academic-program/model/types.ts`의 목록 모양을 그대로 옮겼다. 두 앱은 소스를
 * 공유하지 않으므로(FSD 레이어는 앱마다 갖는다 — 루트 AGENTS.md) 사본이 맞고, 이 앱이 필요한
 * 것은 **목록 한 건의 요약**뿐이다 — 팀원·회차·출석 같은 운영은 lms의 몫이고 여기서는 lms로
 * 가는 링크만 만든다.
 */

/**
 * 학술_활동_상태 (acdm_actv.acdm_actv_stts_cd).
 *
 * 고정 enum(서버 `AcademicProgramStatus`)이라 표준코드 시드가 없다 — 응답은 raw enum 문자열만
 * 온다. 세 값뿐이다 — `RECRUITING`은 없다(모집 시작은 `APPROVED → ONGOING` 전이).
 */
export type AcdmActvSttsCd = "APPROVED" | "ONGOING" | "COMPLETED";

/**
 * table: acdm_actv — 내가 스터디장/팀장인 활동 한 건 (`AcademicProgramSummaryResponse`).
 *
 * `GET /v1/academic-programs?mine=leader`가 내가 스터디장/팀장인 활동만 내려준다. 제목·기간은
 * 상위 `event`에 있고 서버가 합성해 함께 준다. 진행률은 저장하지 않는 파생값이다(계획 항목 수
 * 대비 승인 회차 수).
 *
 * `mine=leader`로만 받으므로 `isLeader`는 언제나 true다 — 그래도 서버 판정을 그대로 옮긴다
 * (`leadrMbrId === 내 mbrId`를 웹에서 다시 계산하지 않는다 · lms AGENTS.md).
 */
export interface AcademicProgramSummary {
  /** acdm_actv_id · PK */
  academicProgramId: number;
  /** 상위 event 의 식별자 */
  eventId: number;
  /** event.title — 카드 제목 */
  title: string;
  /** acdm_actv_type_cd — 런타임 코드테이블 PK 문자열 (STUDY·PROJECT 등). 표시명은 목록 응답에 없다 */
  typeCd: string;
  sttsCd: AcdmActvSttsCd;
  /** 스터디장/팀장 이름. 이관 직후 미지정이면 null */
  leaderName: string | null;
  /** 일시TS — 서버가 Asia/Seoul 오프셋을 붙여 내려준다. 화면은 앞자리를 잘라 쓴다 */
  eventBeginAt: string | null;
  eventEndAt: string | null;
  /** 0~100 (DECIMAL) — 계획 항목 수 대비 승인 회차 수. 값이 없으면 0 */
  progressRatio: number;
  /** 내가 이 활동의 스터디장/팀장인가 — 서버 판정(재계산 금지) */
  isLeader: boolean;
}
