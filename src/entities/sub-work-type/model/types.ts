/**
 * table: sub_work_type — 하위_업무_유형
 * 하위 업무의 승인 정책(승인 필요 여부·승인자 결재 권한·정족수)을 결정한다.
 */

/* ── 서버 연동 타입 (ssccops-server OPS-018 · OPS-019) ────────── */

/*
 * ssccops-server의 하위 업무 유형 API가 내려주는 값이다.
 *
 * **필드명이 DB 컬럼 약어가 아니라 API camelCase인 것은 의도한 것이다** — 운영 API의 판단을
 * entities/work가 이미 했다.
 *
 * **기준_금액(crtrAmt)·지출_여부(expndYn)가 없는 것도 의도한 것이다.** 두 컬럼은 이 API의
 * 범위 밖이라 서버가 응답에 싣지도, 저장 요청에서 받지도 않는다 — 위험도 판정(REQ-016)이
 * 붙을 때 열린다. 화면에 입력란을 남겨 두면 사용자가 넣은 금액이 저장 없이 사라진다.
 *
 * **승인자는 직위 코드가 아니라 결재 권한이다** (서버 #123). 코드는 판정·저장에 쓰는 값이고
 * 표시명(authrt_nm)은 화면에서 바뀌는 운영 데이터라 서버가 함께 내려준다 — 웹이 코드 → 이름
 * 사전을 하드코딩하면(옛 AUTZR_ROLE_NM) 권한 개명 즉시 화면이 어긋난다.
 */

/** 유형 목록·등록·수정·사용 전환이 모두 이 한 모양으로 온다 */
export interface SubWorkTypeSummary {
  subWorkTypeId: number;
  /** 명V100 */
  typeName: string;
  /** 저위험 유형은 승인 면제 (REQ-016) */
  approvalNeeded: boolean;
  /** 승인자 결재 권한 코드 (authrt_cd). 승인 불필요 유형은 서버가 null로 정리한다 */
  authorizerAuthorityCode: string | null;
  /** 승인자 결재 권한 표시명 (authrt_nm) — 표시는 언제나 이 값으로 한다 */
  authorizerAuthorityName: string | null;
  /** false면 단독(승인자 결재 한 번), true면 정족수 */
  minAgreeCountNeeded: boolean;
  /** 정족수 유형에서만 값이 있고 1 이상이다 */
  minAgreeCount: number | null;
  /** 완료 점검 항목 — 서버는 개행으로 저장하고 계약은 배열이다 (구분자를 노출하지 않는다) */
  completionCheckArticles: string[];
  /** 비활성 유형은 새 하위 업무가 고를 수 없을 뿐, 이미 등록된 건은 그대로 남는다 */
  useYn: boolean;
}

/**
 * 유형 폼의 승인자 선택지 한 줄 (서버 #123 GET /v1/sub-work-types/authorizer-authorities).
 * 코드 어휘는 서버 AuthorityCode.subWorkApprovers()가 정하고(응답 순서 = 표시 순서),
 * 표시명은 authrt_nm에서 온다.
 */
export interface AuthorizerAuthority {
  authrtCd: string;
  authrtNm: string;
}
