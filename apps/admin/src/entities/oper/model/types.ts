import type { OperTypeCd, PrrtyRnkCd } from "@/shared/config/codes";
import type { MeetingListItem } from "@/entities/meeting";
import type { SubWorkListItem } from "@/entities/sub-work";
import type { WorkListItem } from "@/entities/work";

/**
 * 운영 통합 조회 응답 (ssccops-server OPS-001 · GET /v1/operations · ssccops-web#63).
 *
 * 세 배열은 업무 목록(OPS-020)·하위 업무 목록(OPS-008)·회의 목록(OPS-031)과 같은 도메인
 * 타입을 재사용한다 — 서버가 같은 DTO를 쓰는 자원이라 통합 화면이 다른 타입으로 다시
 * 정의하면 통합 화면과 각 목록 화면이 같은 건을 다르게 그릴 수 있다(DashboardData와 같은
 * 판단). 우측 트리는 `subWorks[].work.workId`로 상위 업무에 묶는다.
 */
export interface OperationsHubData {
  works: WorkListItem[];
  subWorks: SubWorkListItem[];
  meetings: MeetingListItem[];
}

/**
 * table: oper — 운영
 * work · sub_work · mtg 의 상위 테이블. 제목·담당자·우선순위·기간·소프트삭제를 보유한다.
 */
export interface Oper {
  /** 식별자N19 · PK */
  operId: number;
  /** WORK / SUB_WORK / MEETING */
  operTypeCd: OperTypeCd;
  /** 제목V256 — 운영 주제 제목 */
  operTtl: string;
  /** 운영 건을 등록한 회원 · 인증 주체로 자동 기록, 사후 변경 불가 */
  operRgtrId: number | null;
  prrtyRnkCd: PrrtyRnkCd;
  /** 일시TS — 운영 시작 시점 */
  bgngDt: string | null;
  /** 일시TS — 운영 종료 시점 */
  endDt: string | null;
  /** 실행 책임 회원 1인 · 등록자와 다를 수 있고 이관 가능 */
  picId: number;
  /** 일시TS — 소프트 삭제 */
  delDt: string | null;
  crtDt: string;
  mdfcnDt: string;
}
