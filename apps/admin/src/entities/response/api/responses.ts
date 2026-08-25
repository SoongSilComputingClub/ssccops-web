import type { RspnsCn } from "@ssccops/form-renderer";
import type {
  MbrGrdCd,
  MbrSttsCd,
  RspnsPrcsSeCd,
  RspnsSttsCd,
} from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type {
  AcademicProgramPreview,
  CurriculumItemPreview,
  FormResponseDetail,
  FormResponseItem,
  FormResponseReviewHistory,
  ResponseMember,
  ResponseMemberDetail,
} from "../model/types";

/*
 * 폼 응답 조회·상태 변경 API (ssccops-server #37).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다.** #37은 아직 구현 전이라
 * 필드명·중첩 구조가 흔들릴 수 있는데, 화면이 응답 객체를 그대로 들고 다니면 계약이 바뀔
 * 때마다 뷰 전체를 훑어야 한다. 여기서 도메인 타입으로 옮기고 나면 고칠 곳은 아래
 * `to*` 함수뿐이다.
 *
 * 페칭 방식은 apiFetch + useEffect(features/response의 훅)로 간다 — 근거는
 * features/form/model/use-form-list.ts 주석 참고.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface ResponseMemberResponse {
  mbrId: number | null;
  mbrNm: string | null;
  stdntNo: string | null;
  scsbjtNm: string | null;
  mbrGrdCd: MbrGrdCd | null;
  mbrSttsCd: MbrSttsCd | null;
}

interface ResponseMemberDetailResponse extends ResponseMemberResponse {
  genNo: number | null;
  scyrNo: number | null;
  telno: string | null;
}

interface FormResponseSummaryResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnDt: string | null;
  member: ResponseMemberResponse | null;
}

interface FormResponseReviewHistoryResponse {
  formRspnsRvwHstryId: number;
  sbmsnSeq: number | null;
  prcsSeCd: RspnsPrcsSeCd;
  prcsMbrId: number;
  prcsMbrNm: string | null;
  rvwOpnnCn: string | null;
  prcsDt: string | null;
}

interface CurriculumItemPreviewResponse {
  seqno: number | null;
  ttl: string | null;
  planDt: string | null;
}

interface AcademicProgramPreviewResponse {
  typeCd: string | null;
  curriculumItems: CurriculumItemPreviewResponse[] | null;
  migratable: boolean | null;
  failureReason: string | null;
}

interface FormResponseDetailResponse
  extends Omit<FormResponseSummaryResponse, "member"> {
  member: ResponseMemberDetailResponse | null;
  sbmsnSeq: number | null;
  rspnsCn: RspnsCn | null;
  reviewHistories: FormResponseReviewHistoryResponse[] | null;
  prevFormRspnsId: number | null;
  nextFormRspnsId: number | null;
  /** 기획안 폼의 응답에만 실린다 — 그 밖의 응답에서는 필드 자체가 null이다 (서버 #150) */
  academicProgramPreview: AcademicProgramPreviewResponse | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/**
 * `member`가 비어 오는 경우의 방어.
 *
 * 계약상 응답자는 전원 회원이고 `form_rspns_hstry.mbr_id`는 NOT NULL이므로 이 값은 항상
 * 채워져야 한다. 그래도 빈 자리를 남겨 두는 이유는, 조인이 빠진 배포를 만났을 때 목록
 * 전체가 하얗게 죽는 대신 **그 행만 "-"로 보이고 나머지는 멀쩡히 보이게** 하기 위해서다.
 * (예전의 "비회원 응답" 폴백과는 다르다 — 그건 응답 내용에서 이름을 추측하는 경로였고,
 * 여기는 서버가 안 준 값을 추측하지 않고 없다고 표시할 뿐이다.)
 */
function toMember(member: ResponseMemberResponse | null): ResponseMember {
  return {
    mbrId: member?.mbrId ?? 0,
    mbrNm: member?.mbrNm ?? "",
    stdntNo: member?.stdntNo ?? "",
    scsbjtNm: member?.scsbjtNm ?? null,
    mbrGrdCd: member?.mbrGrdCd ?? "TEMP",
    mbrSttsCd: member?.mbrSttsCd ?? "ENROLLED",
  };
}

function toMemberDetail(
  member: ResponseMemberDetailResponse | null,
): ResponseMemberDetail {
  return {
    ...toMember(member),
    genNo: member?.genNo ?? null,
    scyrNo: member?.scyrNo ?? null,
    telno: member?.telno ?? null,
  };
}

function toFormResponseItem(res: FormResponseSummaryResponse): FormResponseItem {
  return {
    formRspnsId: res.formRspnsId,
    // 순번을 모르는 배포에서 1이라고 지어내지 않는다 — 없으면 화면이 표기를 뺀다
    rspnsSeq: res.rspnsSeq ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnDt: res.sbmsnDt,
    member: toMember(res.member),
  };
}

/**
 * 처리 이력 한 줄.
 *
 * **비어 있는 값을 채우지 않는다.** 검토 의견은 승인에서 선택이고 제출 줄에는 아예 없으므로
 * 빈 것이 정상이며, 처리자 이름이 비는 것은 조인이 빠진 배포에서만 일어난다 — 어느 쪽도
 * 여기서 "-"로 메우면 "값이 없다"와 "서버가 -를 줬다"를 구별할 수 없게 된다. 표시 규칙은
 * 그리는 쪽이 정한다.
 */
function toReviewHistory(
  res: FormResponseReviewHistoryResponse,
): FormResponseReviewHistory {
  return {
    formRspnsRvwHstryId: res.formRspnsRvwHstryId,
    sbmsnSeq: res.sbmsnSeq ?? null,
    prcsSeCd: res.prcsSeCd,
    prcsMbrId: res.prcsMbrId,
    prcsMbrNm: res.prcsMbrNm ?? "",
    rvwOpnnCn: res.rvwOpnnCn ?? null,
    prcsDt: res.prcsDt ?? null,
  };
}

/**
 * 승인 미리보기 (서버 #150).
 *
 * **여기서 커리큘럼을 파싱하지 않는다.** 서버가 준 회차 목록을 그대로 옮길 뿐이다 — 응답
 * 원문을 화면이 다시 쪼개면 검토자가 승인한 것과 실제로 만들어지는 것이 갈린다.
 *
 * `migratable`을 `=== true`가 아니라 **`!== false`로 읽는다.** 이 값은 승인 버튼을 잠그는
 * 근거인데, 필드를 내려주지 않는 서버를 만났을 때 "모른다"를 "못 한다"로 바꾸면 멀쩡한 기획안의
 * 승인 경로가 화면에서 사라진다. 화면의 잠금은 어디까지나 왕복을 아끼는 편의이고 실제 방어선은
 * 서버의 400 PROPOSAL_MIGRATION_FAILED다 — 못 막은 승인은 그 400이 사유와 함께 되돌려준다.
 */
function toAcademicProgramPreview(
  res: AcademicProgramPreviewResponse | null,
): AcademicProgramPreview | null {
  if (res === null || res === undefined) return null;
  return {
    typeCd: res.typeCd ?? null,
    curriculumItems: (res.curriculumItems ?? []).map(toCurriculumItemPreview),
    migratable: res.migratable !== false,
    failureReason: res.failureReason ?? null,
  };
}

/*
 * 회차 한 줄. 없는 값을 메우지 않는다 — 회차 번호를 줄 순서로 지어내면 제출자가 3회차를
 * 빼먹은 기획안이 그대로 묻히고(서버 `ProposalCurriculumParser`가 같은 이유로 번호를 부여하지
 * 않는다), 표시 규칙은 그리는 쪽이 정한다.
 */
function toCurriculumItemPreview(
  res: CurriculumItemPreviewResponse,
): CurriculumItemPreview {
  return {
    seqno: res.seqno ?? null,
    ttl: res.ttl ?? "",
    planDt: res.planDt ?? null,
  };
}

function toFormResponseDetail(res: FormResponseDetailResponse): FormResponseDetail {
  return {
    formRspnsId: res.formRspnsId,
    rspnsSeq: res.rspnsSeq ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnDt: res.sbmsnDt,
    sbmsnSeq: res.sbmsnSeq ?? null,
    member: toMemberDetail(res.member),
    rspnsCn: res.rspnsCn ?? {},
    /*
     * 계약상 이력은 처리가 없어도 빈 배열이지 null이 아니다. 그래도 `?? []`를 두는 것은
     * 이력을 내려주지 않는 옛 서버에서 화면이 통째로 죽는 대신 **타임라인만 비게** 하려는
     * 것이다 — 없는 줄을 만들어 내는 것이 아니라 없다는 사실을 그대로 옮긴다.
     */
    reviewHistories: (res.reviewHistories ?? []).map(toReviewHistory),
    prevFormRspnsId: res.prevFormRspnsId ?? null,
    nextFormRspnsId: res.nextFormRspnsId ?? null,
    academicProgramPreview: toAcademicProgramPreview(res.academicProgramPreview),
  };
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/** 응답 조회·검토 처리가 돌려주는 오류 코드 (ssccops-server #37 · #141) */
export const RESPONSE_ERROR = {
  /** 없는 응답 · **다른 폼의 응답 ID**도 같은 코드로 온다 */
  FORM_RESPONSE_NOT_FOUND: "FORM_RESPONSE_NOT_FOUND",
  /**
   * 결론이 난 응답을 다시 심사했거나(승인·반려는 되돌릴 수 없다), DRAFT가 얽힌 전이,
   * 같은 상태로의 재지정, 미심사(SUBMITTED)로 되돌리기 (#141에서 좁아졌다)
   */
  INVALID_RESPONSE_STATUS_TRANSITION: "INVALID_RESPONSE_STATUS_TRANSITION",
  /** 수정요청·반려인데 검토 의견이 비었다 — 공백만 있는 문자열도 같다 (#141) */
  REVIEW_OPINION_REQUIRED: "REVIEW_OPINION_REQUIRED",
  /** 기준 코드 밖의 상태값 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /**
   * 기획안 승인이 학술 활동 이관에 실패해 통째로 롤백됐다 (ssccops-server #150).
   *
   * **폼 응답 검토가 돌려주는 코드라 여기 둔다.** 사유를 만드는 것은 학술 도메인이지만 화면이
   * 그것을 만나는 자리는 `POST .../reviews` 하나뿐이고, 응답 검토 오류를 한 곳에서 문구로
   * 바꾸는 규칙(features/response/model/response-error.ts)을 이 코드만 벗어날 이유가 없다.
   *
   * **사유마다 코드가 갈리지 않는다** — 코드는 하나이고 무엇이 어긋났는지는 `message`가
   * 값으로 나른다(몇 번째 커리큘럼 줄인지까지 담긴다). 그래서 이 코드만은 화면이 서버 문장을
   * 지우지 않고 그대로 실어 보여 준다.
   */
  PROPOSAL_MIGRATION_FAILED: "PROPOSAL_MIGRATION_FAILED",
} as const;

/* ── 조회 ──────────────────────────────────────────────────── */

/** 응답 목록 필터 — 값이 없으면(null) 서버 기본(= 작성 중 제외)으로 조회한다 */
export interface FormResponseListFilter {
  rspnsSttsCd?: RspnsSttsCd | null;
}

/**
 * GET /v1/forms/{formId}/responses — 목록.
 *
 * 상태 필터를 쿼리로 보낸다. 예전에는 목 스토어의 전체를 받아 화면에서 filter()로 걸렀는데,
 * 모집 폼은 응답이 수백 건이라 안 볼 데이터를 통째로 받아 버리는 구조였다.
 *
 * **작성 중(DRAFT)은 기본 조회에서 빠진다** — `statusCode=DRAFT`를 명시했을 때만 나온다.
 * 제출 전 답안이 제출된 응답과 섞여 심사 대상처럼 보이지 않게 하려는 서버 쪽 규칙이고,
 * 웹은 그 규칙을 그대로 따른다(빼는 일을 화면에서 또 하지 않는다).
 *
 * @todo #37이 페이징 방침을 아직 정하지 않았다. 배열이 아니라 페이지 봉투로 바뀌면
 *       이 함수와 목록 화면의 건수 표기를 함께 고쳐야 한다.
 */
export async function fetchFormResponses(
  formId: number,
  filter: FormResponseListFilter = {},
): Promise<FormResponseItem[]> {
  const query = new URLSearchParams();
  if (filter.rspnsSttsCd) query.set("statusCode", filter.rspnsSttsCd);

  const qs = query.toString();
  const base = `/v1/forms/${formId}/responses`;
  const items = await apiFetch<FormResponseSummaryResponse[] | null>(
    qs ? `${base}?${qs}` : base,
  );
  return (items ?? []).map(toFormResponseItem);
}

/**
 * GET /v1/events/{eventId}/applications — 행사에 들어온 신청 (#145 · 서버 #158).
 *
 * **행사 API인데 이 파일에 있는 이유**는 돌려주는 것이 참가자가 아니라 폼 응답이기 때문이다.
 * 서버도 새 규칙을 만들지 않고 폼 응답 조회에 위임할 뿐이라 응답 DTO가 위의 것과 같다 —
 * `entities/event` 쪽에 같은 모양을 한 번 더 옮겨 적으면 계약이 바뀌는 날 한쪽만 고쳐진다.
 * (엔티티 슬라이스끼리는 서로 참조하지 않으므로, 모양을 아는 파일에 호출을 둔다.)
 *
 * 다른 점은 **권한이 `EVENT_MANAGE`라는 것**뿐이다(D8). 폼 전체 권한(`RESPONSE_REVIEW`)이
 * 없는 행사 운영자도 자기 행사의 신청은 볼 수 있어야 한다.
 *
 * 폼이 연결되지 않은 행사는 빈 배열이 아니라 409 `EVENT_HAS_NO_FORM`으로 온다 — 빈 목록은
 * "아직 신청이 없다"로 읽히지만 실제로는 신청을 받을 수단 자체가 없는 상태라, 운영자가 해야
 * 할 일이 전혀 다르다. 문구는 features/event의 오류 매핑이 맡는다.
 */
export async function fetchEventApplications(
  eventId: number,
  filter: FormResponseListFilter = {},
): Promise<FormResponseItem[]> {
  const query = new URLSearchParams();
  if (filter.rspnsSttsCd) query.set("statusCode", filter.rspnsSttsCd);

  const qs = query.toString();
  const base = `/v1/events/${eventId}/applications`;
  const items = await apiFetch<FormResponseSummaryResponse[] | null>(
    qs ? `${base}?${qs}` : base,
  );
  return (items ?? []).map(toFormResponseItem);
}

/**
 * GET /v1/forms/{formId}/responses/{formRspnsId} — 단건 상세.
 *
 * 경로에 formId가 함께 들어가는 것이 핵심이다. 서버가 응답 ID만 보고 조회하면 폼 간 데이터가
 * 새어 나가므로, **다른 폼의 응답 ID는 404 `FORM_RESPONSE_NOT_FOUND`** 로 돌아온다.
 * 화면은 그 404를 "없는 응답"과 똑같이 처리한다 — 운영자에게는 실제로 없는 응답이다.
 */
export async function fetchFormResponse(
  formId: number,
  formRspnsId: number,
): Promise<FormResponseDetail> {
  const res = await apiFetch<FormResponseDetailResponse>(
    `/v1/forms/${formId}/responses/${formRspnsId}`,
  );
  return toFormResponseDetail(res);
}

/* ── 검토 처리 ─────────────────────────────────────────────── */

/** 검토 처리 요청 — 결론과 의견을 함께 보낸다 */
export interface FormResponseReviewInput {
  /** 고를 수 있는 것은 ACCEPTED · CHANGES_REQUESTED · REJECTED 셋뿐이다 */
  rspnsSttsCd: RspnsSttsCd;
  /** 수정요청·반려는 필수, 승인은 선택 */
  rvwOpnnCn: string;
}

/**
 * POST /v1/forms/{formId}/responses/{formRspnsId}/reviews — 검토 처리 (ssccops-server #141).
 *
 * **`PATCH .../status`를 대체한다.** 상태와 검토 의견을 한 요청으로 보낸다 — 두 경로로 나누면
 * 상태는 바뀌었는데 사유가 없는 응답이 남을 수 있고, 이력 행은 잠겨 있어 나중에 채워 넣을
 * 방법도 없다. 화면에서도 이것은 결론과 의견을 적고 한 번 누르는 조작이다.
 *
 * 처리자는 보내지 않는다 — 서버가 인증 주체에서 가져간다. 요청이 실어 보내게 두면 "누가
 * 했는가"를 스스로 적어 넣을 수 있어 이력이 증거가 되지 못한다.
 *
 * 의견은 **빈 문자열이면 아예 넣지 않는다.** 승인에서 선택이라 빈 값을 그대로 보내면 서버가
 * 공백 문자열을 저장할 자리가 생기고, 이력에 "적었지만 비어 있는 의견"이 남는다.
 *
 * 응답 본문(요약 한 건)을 쓰지 않는다 — 변경 후 화면 값은 **재조회로 맞춘다**. 결론 하나가
 * 상태·처리 이력·폼 상세의 응답 요약 집계를 함께 움직이는데 그 파생값을 화면이 다시 셀 수
 * 없고, 전이 응답으로 부분 갱신하면 반려 직후 화면에 이전 사유가 그대로 남는다.
 */
export async function reviewFormResponse(
  formId: number,
  formRspnsId: number,
  input: FormResponseReviewInput,
): Promise<void> {
  const opinion = input.rvwOpnnCn.trim();
  await apiFetch<unknown>(`/v1/forms/${formId}/responses/${formRspnsId}/reviews`, {
    method: "POST",
    body: JSON.stringify({
      rspnsSttsCd: input.rspnsSttsCd,
      ...(opinion ? { rvwOpnnCn: opinion } : {}),
    }),
  });
}
