import type { AutzrRoleCd } from "@/shared/config/codes";

/**
 * table: sub_work_type — 하위_업무_유형
 * 하위 업무의 승인 정책(승인 필요 여부·승인자 역할·정족수·기준 금액)을 결정한다.
 *
 * **아래 SubWorkType은 아직 목 스토어(model/store.ts)를 쓰는 화면 전용이다.** 유형 관리
 * 화면(/operations/types)은 서버 연동(#34)으로 옮겨 갔고 그쪽은 이 파일 뒤쪽의
 * SubWorkTypeSummary를 쓴다. 남은 사용처는 하위 업무 목록·상세, 승인함, 운영 통합,
 * 대시보드이며 그 도메인들이 연동되면 함께 사라진다 (업무 도메인이 #30에서 밟은 경로).
 */
export interface SubWorkType {
  /** 식별자N19 · PK */
  subWorkTypeId: number;
  /** 명V100 — 예산지출 · 대외공지 · 내부행사 · 스터디운영 · 문서제출 */
  typeNm: string;
  /** 여부B — 저위험 유형은 승인 면제 */
  aprvNeedYn: boolean;
  /** 코드V20 — 승인 주체 역할. 승인 불필요 시 null */
  autzrRoleCd: AutzrRoleCd | null;
  /** 여부B — 최소 동의 인원 필요 여부 */
  minNeedAgreCntYn: boolean;
  /** 수I10 — 최소 동의 인원 수 */
  minNeedAgreCnt: number | null;
  /** 금액N15 — 위험도 기준 금액(원) */
  crtrAmt: number | null;
  /** 여부B — 금전 집행 여부 */
  expndYn: boolean;
  /** 내용T — 유형별 완료 조건 */
  cmptnChckArtclCn: string | null;
}

/* ── 서버 연동 타입 (ssccops-server OPS-018 · OPS-019) ────────── */

/*
 * 여기부터는 ssccops-server의 하위 업무 유형 API가 내려주는 값이다.
 *
 * **필드명이 위의 SubWorkType과 다른 것은 의도한 것이다** — 운영 API는 DB 컬럼 약어가 아니라
 * API camelCase를 쓴다(entities/work가 같은 판단을 이미 했다). 값 자체는 같은 기준 코드라
 * shared/config/codes를 그대로 쓴다.
 *
 * **기준_금액(crtrAmt)·지출_여부(expndYn)가 없는 것도 의도한 것이다.** 두 컬럼은 이 API의
 * 범위 밖이라 서버가 응답에 싣지도, 저장 요청에서 받지도 않는다 — 위험도 판정(REQ-016)이
 * 붙을 때 열린다. 화면에 입력란을 남겨 두면 사용자가 넣은 금액이 저장 없이 사라진다.
 */

/** 유형 목록·등록·수정·사용 전환이 모두 이 한 모양으로 온다 */
export interface SubWorkTypeSummary {
  subWorkTypeId: number;
  /** 명V100 */
  typeName: string;
  /** 저위험 유형은 승인 면제 (REQ-016) */
  approvalNeeded: boolean;
  /** 승인 주체 역할. 승인 불필요 유형은 서버가 null로 정리한다 */
  authorizerRoleCode: AutzrRoleCd | null;
  /** false면 단독(승인자 결재 한 번), true면 정족수 */
  minAgreeCountNeeded: boolean;
  /** 정족수 유형에서만 값이 있고 1 이상이다 */
  minAgreeCount: number | null;
  /** 완료 점검 항목 — 서버는 개행으로 저장하고 계약은 배열이다 (구분자를 노출하지 않는다) */
  completionCheckArticles: string[];
  /** 비활성 유형은 새 하위 업무가 고를 수 없을 뿐, 이미 등록된 건은 그대로 남는다 */
  useYn: boolean;
}
