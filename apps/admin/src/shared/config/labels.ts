/*
 * 화면에 쓰는 항목 라벨의 **유일한 출처** (ssccops#87 D-005).
 *
 * ── 왜 사전이 필요한가 ─────────────────────────────────────────
 * 그전까지 라벨은 화면마다 직접 적혀 있었고, 그래서 같은 값이 화면에 따라 다른 이름으로
 * 불렸다 — 회원 목록은 `회원명`인데 가입 화면은 `회원_명`, 응답 목록은 다시 `회원_명`이었다.
 * 회원 목록이 사람 말을 쓴 것도 규칙이 아니라 그 화면이 그렇게 적었기 때문이라, 화면이
 * 늘어날 때마다 어느 쪽으로든 다시 갈렸다. 문자열을 찾아 바꾸는 것만으로는 같은 자리로
 * 돌아오므로 **한곳에서 꺼내 쓰게** 한다.
 *
 * ── 언더스코어 이름을 화면에 쓰지 않는다 ────────────────────────
 * `회원_명`·`학생_번호`는 데이터사전의 **컬럼 ID**다. 개발자가 스키마를 되짚을 때 쓰는
 * 식별자이지 사람에게 보여 줄 이름이 아니다 — 가입 화면은 동아리에 처음 들어오는 사람이
 * 보는 첫 화면인데 거기에 내부 스키마 용어가 그대로 서 있었다. 같은 판단이
 * `shared/config/constants.ts`에 이미 적혀 있다(#57 CSV 매핑 필드).
 *
 * ── 주석·JSDoc의 표준용어는 그대로 둔다 ─────────────────────────
 * 이 사전이 바꾸는 것은 **사용자에게 보이는 문자열뿐**이다. 코드 주석의 `회원_명V50`처럼
 * 데이터사전의 어느 컬럼인지를 적어 둔 것까지 사람 말로 바꾸면 사전과의 대응이 끊긴다.
 *
 * ── 왜 shared 인가 ─────────────────────────────────────────────
 * 같은 어휘를 여러 도메인이 나눠 쓴다 — `시작 일시`는 운영·폼·응답에 모두 나오고 `회원명`은
 * 회원·응답·가입에 나온다. 엔티티별로 나누면 같은 값이 세 벌이 되어 지금 고치는 문제로
 * 되돌아온다.
 *
 * ── 어디까지 사전에서 꺼내는가 ─────────────────────────────────
 * **항목의 이름을 부르는 자리**만이다 — 입력란 라벨, 표 머리글, 키-값 표의 키. 그 자리는
 * 같은 값이 화면마다 다르게 불리면 곧바로 문제가 되므로 한곳에서 와야 한다.
 *
 * 반대로 **문장 속의 말은 사전에서 꺼내지 않는다.** "재학 회원은 기수를 제외한 모든 항목이
 * 필수입니다" 같은 안내문이나 "학번을 입력하세요" 같은 검증 문구는 조사가 앞말에 붙어
 * 바뀌므로(`학번을` / `학과를`) 사전 값을 끼워 넣으면 조사를 문장이 아니라 사전 값에
 * 맞춰야 한다. 문장은 문장으로 적고, 대신 언더스코어 표기를 쓰지 않는다.
 *
 * 키는 컬럼 ID가 아니라 웹이 쓰는 필드 이름(카멜케이스)이고, 값 옆 주석에 대응하는
 * 데이터사전 컬럼을 남긴다.
 */
export const FIELD_LABEL = {
  /* ── 회원 (mbr) ─────────────────────────────────────────── */
  /** mbr_id */
  memberId: "회원 ID",
  /** mbr_nm (회원_명) */
  memberName: "회원명",
  /** stdnt_no (학생_번호) */
  studentNumber: "학번",
  /** scsbjt_nm (학과_명) */
  departmentName: "학과",
  /** scyr_no (학년_번호) */
  academicYear: "학년",
  /** gen_no (기수_번호) */
  generationNumber: "기수",
  /** mbr_grd_cd (회원_등급) */
  membershipGrade: "회원 등급",
  /** mbr_stts_cd (회원_상태) */
  membershipStatus: "회원 상태",
  /** mbr_role 이 이어 준 지금 유효한 역할들 (현재_역할) */
  currentRoles: "현재 역할",
  /** sys_join_ymd (전산_가입_일자) — 시스템에 계정이 생긴 날. 동아리 입부일이 아니다 */
  systemJoinDate: "전산 가입 일자",
  /** clb_join_yr_no (동아리_가입_연도_번호) — 기수의 근거. 모르면 비어 있다 */
  clubJoinYear: "동아리 가입 연도",
  /** clb_join_mm_no (동아리_가입_월_번호) — 모르면 비워 둔다 */
  clubJoinMonth: "동아리 가입 월",

  /* ── 역할 분류 (role_clsf) ──────────────────────────────── */
  /** indct_seqno (표시_순번) */
  displayOrder: "표시 순번",
  /** role_clsf_cd (역할_분류_코드) */
  roleClassificationCode: "분류 코드",
  /** role_clsf_nm (역할_분류_명) */
  roleClassificationName: "분류명",
  /** role.role_clsf_cd 가 가리키는 분류 자체 (역할_분류) — 역할 목록·편집의 칸 이름 */
  roleClassification: "역할 분류",
  /** role_nm (역할_명) */
  roleName: "역할명",

  /* ── 운영 · 업무 (oper · work · sub_work) ───────────────── */
  /** oper_id (운영_ID) */
  operationId: "운영 ID",
  /** oper_type_cd (운영_유형) */
  operationType: "운영 유형",
  /** oper_ttl_nm (운영_제목) */
  operationTitle: "운영 제목",
  /** prrt_rnk_cd (우선_순위_코드) */
  priority: "우선순위",
  /** bgng_dt (시작_일시) */
  startAt: "시작 일시",
  /** end_dt (종료_일시) */
  endAt: "종료 일시",
  /** dline_dt (마감_일시) */
  dueAt: "마감 일시",
  /** work_id (업무_ID) */
  workId: "업무 ID",
  /** work_type_cd (업무_유형_코드) */
  workType: "업무 유형",
  /** sub_work_id (하위_업무_ID) */
  subWorkId: "하위 업무 ID",
  /** sub_work_type_id (하위_업무_유형) */
  subWorkType: "하위 업무 유형",
  /** work_stts_cd (업무_상태) */
  workStatus: "업무 상태",
  /** aprv_stts_cd (승인_상태) */
  approvalStatus: "승인 상태",
  /** work_cn (업무_내용) */
  workContent: "업무 내용",
  /** cmptn_crtr_cn (완료_기준_내용) */
  completionCriteria: "완료 기준",
  /** extrl_url_addr (외부_URL_주소) */
  externalUrl: "외부 URL",
  /** gnrl_evl_cn (총평_내용) */
  generalReview: "총평",
  /** work_prgrs_rt (업무_진행_률) */
  progressRate: "진행률",

  /* ── 회의 (mtg · mtg_dtl) ───────────────────────────────── */
  /** mtg_id (회의_ID) */
  meetingId: "회의 ID",
  /** mtg_se_cd (회의_구분) */
  meetingCategory: "회의 구분",
  /** atndnc_trgt_cd (참석_대상) */
  attendeeTarget: "참석 대상",
  /** mtg_plc_nm (회의_장소_명) */
  meetingPlace: "회의 장소",
  /** mtg_mngr (회의_책임자) */
  meetingOwner: "회의 책임자",
  /** intrnl_mtg_dtl (내부_회의_상세) */
  internalMeetingDetail: "내부 회의 상세",
  /** extrl_mtg_dtl (외부_회의_상세) */
  externalMeetingSummary: "외부 회의 상세",
  /** agnd_cn (안건_내용) */
  agendaContent: "안건 내용",
  /** rslt_cn (결과_내용) */
  agendaResult: "결과 내용",

  /* ── 폼 (form · form_lbl) ───────────────────────────────── */
  /** form_ttl_nm (폼_제목_명) */
  formTitle: "폼 제목",
  /** rcpt_bgng_dt (접수_시작_일시) */
  receiptStartAt: "접수 시작 일시",
  /** rcpt_end_dt (접수_종료_일시) */
  receiptEndAt: "접수 종료 일시",
  /** form_lbl (폼_라벨) */
  formLabel: "폼 라벨",
  /** qitem_ver (문항_구성_버전) */
  qitemVersion: "문항 버전",
  /** mltpl_rspns_yn (다중_응답_허용_여부) */
  multipleResponse: "다중 응답 허용",
  /** crtr_mbr_id 가 가리키는 회원 (생성자_회원) */
  creator: "생성자",
  /** crt_dt (생성_일시) */
  createdAt: "생성 일시",
  /** mdfcn_dt (수정_일시) */
  updatedAt: "수정 일시",

  /* ── 응답 (form_rspns_hstry) ────────────────────────────── */
  /** sbmsn_dt (제출_일시) */
  submittedAt: "제출 일시",
  /** rspns_stts_cd (응답_상태) */
  responseStatus: "응답 상태",
  /** rspns_cn (응답_내용) */
  responseContent: "응답 내용",

  /* ── 행사 (event · event_clsf) ──────────────────────────── */
  /** event_ttl (행사_제목) */
  eventTitle: "행사 제목",
  /** event_clsf_cd 가 가리키는 분류 자체 (행사_분류) — 목록·편집의 칸 이름 */
  eventClassification: "행사 분류",
  /** event_clsf_cd (행사_분류_코드) */
  eventClassificationCode: "분류 코드",
  /** event_clsf_nm (행사_분류_명) */
  eventClassificationName: "분류명",
  /** event_stts_cd (행사_상태) */
  eventStatus: "행사 상태",
  /** mtxt_cn (본문_내용) */
  eventContent: "본문",
  /** thmb_url_addr (썸네일_URL_주소) */
  thumbnailUrl: "대표 이미지 URL",
  /** event_bgng_dt (행사_시작_일시) */
  eventStartAt: "행사 시작 일시",
  /** event_end_dt (행사_종료_일시) */
  eventEndAt: "행사 종료 일시",
  /** plc_nm (장소_명) */
  placeName: "장소",
  /** ptcp_lmt_cnt (참가_제한_수) */
  participantLimit: "정원",
  /** form_id 가 가리키는 전속 연결 폼 (연결_폼) */
  linkedForm: "연결 폼",
} as const;
