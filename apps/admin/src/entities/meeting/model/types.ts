import type {
  AtndTrgtCd,
  MtgSeCd,
  MtgSttsCd,
  OperTypeCd,
  PrcsSeCd,
  PrrtyRnkCd,
} from "@/shared/config/codes";

/**
 * table: mtg — 회의
 * 제목·일시는 상위 테이블 oper 에 있다 (entities/oper 참조).
 *
 * **아래 Mtg·MtgDtl은 아직 목 스토어(model/store.ts)를 쓰는 화면 전용이다.** 회의 목록·상세·
 * 등록은 서버 연동(#83 · ssccops-web#56)으로 옮겨 갔고 그쪽은 이 파일 뒤쪽의 MeetingListItem·
 * MeetingDetail·MeetingAgenda를 쓴다(entities/work의 Work·WorkDetail과 같은 이행 방식).
 * 남은 사용처는 운영 통합 화면(operations-hub)이며, 그 화면이 연동되면(OPS-001 미구현) 함께
 * 사라진다.
 */
export interface Mtg {
  /** 식별자N19 · PK */
  mtgId: number;
  /** FK oper.oper_id — 대상 운영 */
  operId: number;
  /** REGULAR 정례 / TOPIC 주제 */
  mtgSeCd: MtgSeCd | null;
  /** 전체 / 국장단 / 임시소집 */
  atndTrgtCd: AtndTrgtCd | null;
  mtgSttsCd: MtgSttsCd | null;
  /** 회의 주관자 회원_ID */
  mtgRbprsnId: number;
  /** 명V100 */
  mtgPlcNm: string | null;
  /** 내용T — 내부 상세본 */
  insdMtgDtlCn: string | null;
  /** 내용T — 제출 요약본 */
  otsdMtgDtlCn: string | null;
}

/** table: mtg_dtl — 회의_상세 (안건) */
export interface MtgDtl {
  mtgDtlId: number;
  mtgId: number;
  /** 명V100 — 운영 건과 연결되지 않은 안건의 제목 */
  agndNm: string | null;
  /** 미처리 / 보류 / 종료 */
  prcsSeCd: PrcsSeCd | null;
  /** 순서N5 */
  agndSeq: number | null;
  /**
   * 연결 운영 건.
   * @db-pending 컬럼정의서의 mtg_dtl Seq 3 이 결번이고 agnd_nm 설명이
   * "운영건ID가 NULL일 때"를 전제하므로, 누락된 oper_id 컬럼으로 본다.
   */
  operId: number | null;
  /** 내용T */
  agndCn: string | null;
  /** 내용T */
  rsltCn: string | null;
  /** 제출자_ID — 안건 제출자 */
  prsnrId: number;
}

/* ── 서버 연동 타입 (ssccops-server OPS-024·025·026·027·028·029·031) ──────────── */

/*
 * 여기부터는 ssccops-server의 회의 API가 내려주는 값이다.
 *
 * **필드명이 위의 Mtg·MtgDtl과 다른 것은 의도한 것이다** — 운영 API는 DB 컬럼 약어가 아니라
 * API camelCase를 쓴다(entities/work의 같은 판단 참고). 값 자체는 같은 기준 코드라
 * shared/config/codes를 그대로 쓴다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다 ("2026-09-03T19:00:00+09:00").
 */

/** 담당자·등록자·제출자 요약 — 서버가 식별자와 이름 두 값만 내린다 */
export interface MeetingMemberRef {
  memberId: number;
  name: string;
}

/** 회의 목록(OPS-031) 카드 한 장 */
export interface MeetingListItem {
  meetingId: number;
  /** oper_ttl — 카드 제목 */
  operationId: number;
  title: string;
  meetingCategory: MtgSeCd | null;
  meetingStatus: MtgSttsCd | null;
  attendeeScope: AtndTrgtCd | null;
  /** 회의 책임자와 항상 같은 회원이다(ssccops-web#56) */
  personInCharge: MeetingMemberRef | null;
  location: string | null;
  agendaCount: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
}

/**
 * 회의 상태 전이 액션 (OPS-026 · TR-M1~M4).
 *
 * 화면의 버튼 문구(개회·회의록작성·종료·취소)가 아니라 이 코드로 보낸다. 개회·회의록작성·
 * 종료는 회의 책임자 본인만 할 수 있고, 전이표에 없는 조합은 서버가 409
 * TRANSITION_NOT_ALLOWED로 끊는다.
 */
export type MeetingTransition = "OPEN" | "WRITE_MINUTES" | "CLOSE" | "CANCEL";

/** 안건이 연결한 운영 건(업무·하위 업무) 요약 */
export interface MeetingAgendaTarget {
  operationId: number;
  operationType: OperTypeCd;
  title: string;
}

/** 회의 상세(OPS-025)의 안건 한 건 */
export interface MeetingAgenda {
  agendaId: number;
  meetingId: number;
  /** 운영 건에 연결된 안건은 NULL — targetOperation.title이 제목이다 */
  agendaName: string | null;
  processStatus: PrcsSeCd | null;
  agendaOrder: number | null;
  targetOperation: MeetingAgendaTarget | null;
  content: string | null;
  resultContent: string | null;
  submitter: MeetingMemberRef | null;
}

/**
 * 회의 상세(OPS-025).
 *
 * 화면은 '상위 속성 · oper'와 '확장 속성 · mtg' 두 블록으로 나눠 보여주지만 응답은 평면이다 —
 * 담당자·기간은 실은 oper의 값이라 블록대로 중첩하면 같은 값을 두 번 받게 된다(서버 주석).
 */
export interface MeetingDetail {
  meetingId: number;
  /** 화면 '운영_ID' — mtg_id가 아니라 상위 oper의 식별자다 */
  operationId: number;
  operationType: OperTypeCd;
  title: string;
  meetingCategory: MtgSeCd | null;
  meetingStatus: MtgSttsCd | null;
  attendeeScope: AtndTrgtCd | null;
  /** 회의 책임자와 항상 같은 회원이다(ssccops-web#56) */
  personInCharge: MeetingMemberRef | null;
  /** 이관 데이터는 등록자가 없다 */
  registrant: MeetingMemberRef | null;
  startAt: string | null;
  endAt: string | null;
  priority: PrrtyRnkCd;
  location: string | null;
  /** 내부 상세본 — 채우는 API가 아직 없어 지금은 늘 NULL */
  internalDetail: string | null;
  /** 제출 요약본 — 채우는 API가 아직 없어 지금은 늘 NULL */
  externalSummary: string | null;
  agendas: MeetingAgenda[];
  createdAt: string | null;
  updatedAt: string | null;
}
