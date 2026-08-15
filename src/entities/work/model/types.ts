import type {
  AprvSttsCd,
  OperTypeCd,
  PrrtyRnkCd,
  WorkSttsCd,
  WorkTypeCd,
} from "@/shared/config/codes";

/**
 * table: work — 업무
 * 제목·담당자·기간은 상위 테이블 oper 에 있다 (entities/oper 참조).
 *
 * **아래 Work는 아직 목 스토어(model/store.ts)를 쓰는 화면 전용이다.** 업무 목록·상세·등록은
 * 서버 연동(#30)으로 옮겨 갔고 그쪽은 이 파일 뒤쪽의 WorkListItem·WorkDetail을 쓴다.
 * 남은 사용처는 하위 업무·회의·운영 통합 화면이며, 그 도메인들이 연동되면 함께 사라진다.
 */
export interface Work {
  /** 식별자N19 · PK */
  workId: number;
  /** FK oper.oper_id — 대상 운영 */
  operId: number;
  /** 행사 / 상시 / 정례운영 */
  workTypeCd: WorkTypeCd;
  /** 기획 / 진행 / 검토 / 완료 */
  workSttsCd: WorkSttsCd;
  /** 내용T — 행사 종료 회고 */
  grvwCn: string | null;
  /** 율N5,2 — 하위 완료율 집계 */
  workPrgrsRt: number;
}

/* ── 서버 연동 타입 (ssccops-server OPS-002·003·020) ──────────── */

/*
 * 여기부터는 ssccops-server의 업무 API가 내려주는 값이다.
 *
 * **필드명이 위의 Work·Oper와 다른 것은 의도한 것이다** — 운영 API는 DB 컬럼 약어가 아니라
 * API camelCase를 쓴다(정의서 01_API_필드: title·workType·startAt). 서버 계약을 그대로
 * 옮겨 두어야 응답이 바뀌었을 때 어디를 고쳐야 하는지가 분명하다 (entities/session이 같은
 * 판단을 이미 했다). 값 자체는 같은 기준 코드라 shared/config/codes를 그대로 쓴다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다 ("2026-07-01T00:00:00+09:00").
 */

/** 담당자·등록자 요약 — 서버가 식별자와 이름 두 값만 내린다 */
export interface WorkMemberRef {
  memberId: number;
  name: string;
}

/** 업무 목록(OPS-020) 카드 한 장 */
export interface WorkListItem {
  workId: number;
  /** oper_ttl — 카드 제목 */
  title: string;
  workType: WorkTypeCd;
  workStatus: WorkSttsCd;
  owner: WorkMemberRef | null;
  startAt: string | null;
  endAt: string | null;
  /** 0~100 — 저장 컬럼이 아니라 하위 업무 진행률의 평균(AGG-01) */
  progressRate: number;
  /** 삭제된 하위 업무는 빠진 건수. 진행률의 분모와 같은 기준이다 */
  subWorkCount: number;
}

/** 업무 상세(OPS-003)의 하위 업무 요약 한 행 */
export interface WorkSubWorkSummary {
  subWorkId: number;
  title: string;
  owner: WorkMemberRef | null;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  progressRate: number;
  dueAt: string | null;
}

/**
 * 업무 상세(OPS-003).
 *
 * 화면은 '상위 속성 · oper'와 '확장 속성 · work' 두 블록으로 나눠 보여주지만 응답은 평면이다 —
 * 담당자·기간은 실은 oper의 값이라 블록대로 중첩하면 같은 값을 두 번 받게 된다(서버 주석).
 */
export interface WorkDetail {
  workId: number;
  /** 화면 '운영_ID' — work_id가 아니라 상위 oper의 식별자다 */
  operationId: number;
  operationType: OperTypeCd;
  title: string;
  workType: WorkTypeCd;
  workStatus: WorkSttsCd;
  priority: PrrtyRnkCd;
  owner: WorkMemberRef | null;
  /** 이관 데이터는 등록자가 없다 */
  registrant: WorkMemberRef | null;
  startAt: string | null;
  endAt: string | null;
  /** 총평_내용 — 조회 전용이며 등록은 별도 API(OPS-006)다 */
  generalReview: string | null;
  progressRate: number;
  subWorkCount: number;
  subWorks: WorkSubWorkSummary[];
  createdAt: string | null;
  updatedAt: string | null;
}
