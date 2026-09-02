import type { AcdmActvSttsCd, SesnSttsCd } from "@/shared/config/codes";
import { ApiError, apiFetch, apiFetchList } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";
import type { CurriculumItemWithSession } from "@/entities/curriculum-item";
import type {
  AcademicProgramDetail,
  AcademicProgramListFilter,
  AcademicProgramListPage,
  AcademicProgramProgress,
  AcademicProgramSummary,
  AcademicProgramTransitionInput,
  AcademicProgramTransitionResult,
} from "../model/types";

/*
 * 학술 활동 조회·전이 API (ssccops-server #131 상세·목록 · #134 커리큘럼 · #133 전이 · #122).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼·업무 도메인이 잡아 둔 규칙
 * 그대로다. 여기서 도메인 타입으로 옮기고 나면 계약이 바뀌었을 때 고칠 곳은 아래 `to*`
 * 함수뿐이다.
 *
 * ── 인가가 핸들러마다 갈린다 ─────────────────────────────────
 * 조회 셋(상세·목록·커리큘럼)은 인증만 요구한다 — 가입한 회원 누구나 본다. 전이 하나만
 * `ACADEMIC_PROGRAM_MANAGE`(학술국장)다. 그래서 "목록은 보이는데 전이만 403"이 정상이다
 * (sub_work_type 과 같은 자리).
 *
 * ── 활동 생성 API 는 없다 ────────────────────────────────────
 * 활동은 기획안(sys_form_cd='PROPOSAL') 승인 시 서버가 event·acdm_actv·crclm_artcl 을
 * 만드는 이관(#150)으로 생긴다. 화면에 '활동 등록' 버튼을 두지 않는다(#122).
 *
 * ── 서버가 필드명을 리네임했다 (ssccops-server#178, 2026-08-28) ─
 * URL 경로는 그대로이고 JSON 필드명만 데이터사전 표준 약어로 바뀌었다 — 옛 이름
 * (scheduleTxt·cpctyMinCnt·planDt·realDt·cn·noticeCn 등)으로 쓰면 타입은 통과하고
 * 값만 조용히 빈다. 아래 Response 인터페이스는 리네임 이후 record 가 기준이다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다("2026-03-01T00:00:00+09:00").
 * 커리큘럼의 날짜는 LocalDate("2026-03-01")다(일자, 일시 아님).
 */

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 학술 활동 API 가 돌려주는 오류 코드 (ssccops-server AcademicProgramErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** `INVALID_CURSOR` enum 은 코드로
 * `"VALIDATION_FAILED"` 를 내린다(업무 도메인의 커서 오류와 같은 판단 — 첫 페이지로 조용히
 * 되돌리면 목록이 잘린 것을 알 수 없다). `@RequireAuthority` AOP 의 403 은
 * `"AUTHORITY_REQUIRED"` 로, 소유권 판정(leadrMbrId 본인)의 403 은 `"FORBIDDEN"` 으로 온다.
 */
export const ACADEMIC_PROGRAM_ERROR = {
  /** 없는 활동 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 커서 형식 오류·정렬 불일치 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — sttsCd·sort 파라미터가 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** ACADEMIC_PROGRAM_MANAGE 권한 없음 (403 · AOP) */
  AUTHORITY_REQUIRED: "AUTHORITY_REQUIRED",
  /** 스터디장/팀장 본인이 아님 (403 · 레코드 단위 소유권 판정) */
  FORBIDDEN: "FORBIDDEN",
  /** 전이표에 없는 조합 (409) — START_RECRUITMENT 를 ONGOING 에서 다시 부르는 등 */
  INVALID_ACADEMIC_PROGRAM_TRANSITION: "INVALID_ACADEMIC_PROGRAM_TRANSITION",
  /** START_RECRUITMENT 인데 연결된 모집 폼이 없다 (409) — 데이터 정합성이 깨진 경우 */
  FORM_NOT_LINKED: "FORM_NOT_LINKED",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface AcademicProgramProgressResponse {
  totalSessionCount: number | null;
  approvedSessionCount: number | null;
  ratio: number | null;
}

interface AcademicProgramSummaryResponse {
  academicProgramId: number;
  eventId: number;
  title: string | null;
  typeCd: string;
  sttsCd: AcdmActvSttsCd;
  leadrMbrNm: string | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  progressRatio: number | null;
  isLeader: boolean;
}

interface AcademicProgramDetailResponse {
  academicProgramId: number;
  eventId: number;
  title: string | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
  typeCd: string;
  typeNm: string | null;
  sttsCd: AcdmActvSttsCd;
  goalCn: string | null;
  prepCn: string | null;
  schdlCn: string | null;
  pscpMinCnt: number | null;
  pscpMaxCnt: number | null;
  prpsrMbrId: number | null;
  prpsrMbrNm: string | null;
  leadrMbrId: number | null;
  leadrMbrNm: string | null;
  isLeader: boolean;
  isProposer: boolean;
  /** 모집 시작 전이거나 서버 옛 버전이면 빠져 있다 — 옵셔널로 받아 null 로 굳힌다 (#122) */
  formId?: number | null;
  formReceiptStatus?: string | null;
  progress: AcademicProgramProgressResponse | null;
  curriculumItemCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CurriculumItemWithSessionResponse {
  curriculumItemId: number;
  seqno: number | null;
  ttl: string | null;
  planYmd: string | null;
  sessionId: number | null;
  sesnSttsCd: SesnSttsCd;
  actlYmd: string | null;
  prgrsCn: string | null;
  isEditable: boolean;
}

interface AcademicProgramTransitionResponse {
  academicProgramId: number | null;
  beforeSttsCd: AcdmActvSttsCd | null;
  afterSttsCd: AcdmActvSttsCd | null;
  formReceiptStatus: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/** DECIMAL — 서버는 70.00처럼 내려준다. 값이 없으면 0 */
function toRatio(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toProgress(
  res: AcademicProgramProgressResponse | null,
): AcademicProgramProgress {
  return {
    totalSessionCount: res?.totalSessionCount ?? 0,
    approvedSessionCount: res?.approvedSessionCount ?? 0,
    ratio: toRatio(res?.ratio),
  };
}

function toSummary(
  res: AcademicProgramSummaryResponse,
): AcademicProgramSummary {
  return {
    academicProgramId: res.academicProgramId,
    eventId: res.eventId,
    title: res.title ?? "",
    typeCd: res.typeCd,
    sttsCd: res.sttsCd,
    leaderName: res.leadrMbrNm ?? null,
    eventBeginAt: res.eventBgngDt,
    eventEndAt: res.eventEndDt,
    progressRatio: toRatio(res.progressRatio),
    isLeader: res.isLeader,
  };
}

function toDetail(res: AcademicProgramDetailResponse): AcademicProgramDetail {
  return {
    academicProgramId: res.academicProgramId,
    eventId: res.eventId,
    title: res.title ?? "",
    eventBeginAt: res.eventBgngDt,
    eventEndAt: res.eventEndDt,
    placeName: res.plcNm,
    typeCd: res.typeCd,
    // 서버가 함께 내려주는 표시명 — 코드 → 이름 사전을 웹에 두지 않는다
    typeName: res.typeNm ?? "",
    sttsCd: res.sttsCd,
    goalContent: res.goalCn,
    prepContent: res.prepCn,
    scheduleText: res.schdlCn,
    participantMinCount: res.pscpMinCnt,
    participantMaxCount: res.pscpMaxCnt,
    proposerMemberId: res.prpsrMbrId,
    proposerMemberName: res.prpsrMbrNm,
    leaderMemberId: res.leadrMbrId,
    leaderMemberName: res.leadrMbrNm,
    isLeader: res.isLeader,
    isProposer: res.isProposer,
    // formId 가 비어 있을 수 있다 — 옵셔널로 받아 null 로 굳힌다 (행사 앱이 세운 규칙 · #122)
    formId: res.formId ?? null,
    formReceiptStatus: res.formReceiptStatus ?? null,
    progress: toProgress(res.progress),
    curriculumItemCount: res.curriculumItemCount ?? 0,
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
  };
}

function toCurriculumItem(
  res: CurriculumItemWithSessionResponse,
): CurriculumItemWithSession {
  return {
    curriculumItemId: res.curriculumItemId,
    seqno: res.seqno,
    title: res.ttl ?? "",
    planYmd: res.planYmd,
    sessionId: res.sessionId,
    sesnSttsCd: res.sesnSttsCd,
    actualYmd: res.actlYmd,
    progressContent: res.prgrsCn,
    isEditable: res.isEditable,
  };
}

/* ── 목록 ──────────────────────────────────────────────────── */

/**
 * GET /v1/academic-programs — 활동 목록 (#131).
 *
 * 커서 페이징이라 `page` 봉투가 필요하다 — `apiFetch` 는 data 만 돌려주므로 `apiFetchList`
 * 를 쓴다. 정렬 기본값은 서버가 `-createdAt`(등록 최신순)으로 잡는다 — 방금 승인 이관된
 * 활동이 첫 페이지 맨 위에 온다.
 */
export async function fetchAcademicPrograms(
  filter: AcademicProgramListFilter = {},
): Promise<AcademicProgramListPage> {
  const query = new URLSearchParams();
  if (filter.typeCd) query.set("typeCd", filter.typeCd);
  if (filter.sttsCd) query.set("sttsCd", filter.sttsCd);
  if (filter.keyword) query.set("keyword", filter.keyword);
  if (filter.mine) query.set("mine", "true");
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));
  if (filter.sort) query.set("sort", filter.sort);

  const qs = query.toString();
  const { data, page } = await apiFetchList<AcademicProgramSummaryResponse>(
    qs ? `/v1/academic-programs?${qs}` : "/v1/academic-programs",
  );

  return {
    academicPrograms: data.map(toSummary),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
  };
}

/* ── 상세 ──────────────────────────────────────────────────── */

/**
 * GET /v1/academic-programs/{academicProgramId} — 상세 (#131).
 *
 * 목록에서 find() 로 고르지 않고 반드시 이 호출을 쓴다 — 목록 응답에는 목표·준비물·일정·
 * 진행률 상세도 없고, URL 로 바로 들어온 경우 목록 자체가 메모리에 없다. 소프트 삭제가 없어
 * 존재하면 항상 조회되고, 없으면 404 `ACADEMIC_PROGRAM_NOT_FOUND` 다.
 */
export async function fetchAcademicProgram(
  academicProgramId: number,
): Promise<AcademicProgramDetail> {
  const res = await apiFetch<AcademicProgramDetailResponse>(
    `/v1/academic-programs/${academicProgramId}`,
  );
  return toDetail(res);
}

/* ── 커리큘럼 ──────────────────────────────────────────────── */

/**
 * GET /v1/academic-programs/{academicProgramId}/curriculum-items — 커리큘럼 (#134).
 *
 * 계획(crclm_artcl) + 실적(sesn) 조인 배열이다. 활동 상세 화면의 "커리큘럼 대비 진행" 표
 * 하나가 이 배열을 그대로 쓴다. 페이징이 없다(활동당 회차 수가 적다) — `apiFetch` 로 받는다.
 * 실적이 없는 회차도 `sesnSttsCd` 에 NOT_SUBMITTED 가 채워지므로 화면은 null 분기를 두지
 * 않는다.
 */
export async function fetchCurriculumItems(
  academicProgramId: number,
): Promise<CurriculumItemWithSession[]> {
  const items = await apiFetch<CurriculumItemWithSessionResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/curriculum-items`,
  );
  return (items ?? []).map(toCurriculumItem);
}

/* ── 상태 전이 ─────────────────────────────────────────────── */

/**
 * POST /v1/academic-programs/{academicProgramId}/transitions — 상태 전이 (#133).
 *
 * 모집 시작(START_RECRUITMENT)·종료 승인(APPROVE_COMPLETION) 두 액션이 이 하나의 경로를
 * 쓴다. 다음 상태를 직접 쓰는 PATCH 경로는 없다 — 화면이 액션을 보내고 다음 상태는 전이표가
 * 정한다(work·form 도메인의 전이 엔드포인트 선례).
 *
 * `recruitmentStartAt`·`recruitmentEndAt` 는 START_RECRUITMENT 에서만 쓰인다 —
 * APPROVE_COMPLETION 에 실려 와도 서버가 무시한다. 일시에는 **오프셋을 반드시 붙인다**
 * (`datetime-local` 입력은 오프셋 없는 값을 주는데 서버는 `OffsetDateTime` 이라 본문 파싱
 * 단계에서 400 으로 튕긴다 — `withServiceOffset` 주석 참고).
 *
 * 전이표에 없는 조합은 409 `INVALID_ACADEMIC_PROGRAM_TRANSITION` 이다.
 */
export async function transitionAcademicProgram(
  academicProgramId: number,
  input: AcademicProgramTransitionInput,
): Promise<AcademicProgramTransitionResult> {
  const res = await apiFetch<AcademicProgramTransitionResponse | null>(
    `/v1/academic-programs/${academicProgramId}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({
        transition: input.transition,
        recruitmentStartDt: withServiceOffset(input.recruitmentStartAt ?? null),
        recruitmentEndDt: withServiceOffset(input.recruitmentEndAt ?? null),
      }),
    },
  );

  if (!res?.afterSttsCd) {
    throw new ApiError(
      ACADEMIC_PROGRAM_ERROR.VALIDATION_FAILED,
      "상태는 바뀌었지만 서버가 전이 결과를 돌려주지 않았습니다. 화면을 새로고침해주세요",
    );
  }

  return {
    academicProgramId: res.academicProgramId ?? academicProgramId,
    // 전이가 성공했으면 before 도 서버가 준다 — 없으면 after 로 폴백(값을 만들어 내지 않되 표시가 깨지지 않게)
    beforeSttsCd: res.beforeSttsCd ?? res.afterSttsCd,
    afterSttsCd: res.afterSttsCd,
    formReceiptStatus: res.formReceiptStatus ?? null,
  };
}
