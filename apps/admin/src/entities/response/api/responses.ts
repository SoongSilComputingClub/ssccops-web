import type { RspnsCn } from "@ssccops/form-renderer";
import type {
  MbrGrdCd,
  MbrSttsCd,
  PtcpSttsCd,
  RspnsSttsCd,
  RvwPrcsSeCd,
} from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type {
  AcademicProgramPreview,
  CurriculumItemPreview,
  EventApplication,
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
  /** 대표 문항의 답 (서버 #196). 선언이 없는 폼·지워진 문항·빈 답은 전부 null이다 */
  responseTitle: string | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnDt: string | null;
  member: ResponseMemberResponse | null;
}

/**
 * 행사 신청 목록 항목 (서버 `EventApplicationResponse` · ssccops-server#378).
 *
 * 폼 응답 요약을 `application`으로 **감싸고** 명단 등록 여부를 `participant`로 나란히 싣는다.
 * 서버가 요약의 필드를 옮겨 적지 않고 감싸는 것은, 폼 요약에 필드가 늘어도 여기와 짝을 맞출
 * 일이 없게 하려는 선택이다 — 웹도 같은 이유로 `toFormResponseItem`을 그대로 재사용한다.
 */
interface EventApplicationParticipantResponse {
  eventPtcpId: number;
  ptcpSttsCd: PtcpSttsCd;
}

interface EventApplicationResponse {
  /** 계약상 필수다 — 옵셔널은 봉투 없이 요약을 평면으로 내리던 옛 서버 호환(`toEventApplication`) */
  application?: FormResponseSummaryResponse;
  /** 명단에 없으면 null. 옛 서버에서는 필드 자체가 없다 */
  participant?: EventApplicationParticipantResponse | null;
}

interface FormResponseReviewHistoryResponse {
  formRspnsRvwHstryId: number;
  sbmsnSeq: number | null;
  rvwPrcsSeCd: RvwPrcsSeCd;
  prcsMbrId: number;
  prcsMbrNm: string | null;
  rvwOpnnCn: string | null;
  prcsDt: string | null;
}

interface CurriculumItemPreviewResponse {
  seqno: number | null;
  ttl: string | null;
  planYmd: string | null;
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
    /*
     * 대표 문항의 답이 없는 것은 정상이다(서버 #196) — 선언이 없는 폼, 문항이 지워진 폼,
     * 제출자가 비워 둔 답. 빈 문자열도 null로 굳혀 "값이 없다"를 한 가지로 만든다.
     * 서버가 이 필드를 아직 안 싣는 배포에서도 같은 자리로 떨어진다.
     */
    responseTitle: res.responseTitle?.trim() || null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnDt: res.sbmsnDt,
    member: toMember(res.member),
  };
}

/**
 * 신청 한 줄 — 응답 요약 + 명단 등록 여부.
 *
 * `participant`가 **없거나 null이면 미등록**이다. 옵셔널 체이닝으로 읽는 것은 이 봉투를 아직
 * 싣지 않는 서버(ssccops-server#378 배포 전)를 만나도 목록이 죽지 않게 하기 위해서다 — 그때는
 * 전부 미등록으로 보이고 확정/대기 버튼이 남는데, 중복은 여전히 서버가 409로 막는다.
 * `ptcpSttsCd`가 비어 온 행도 같은 이유로 미등록으로 떨어뜨린다 — 상태를 모르는 배지를
 * 그릴 수 없다.
 *
 * 같은 이유로 `application` 봉투가 없는 행(옛 서버 — 요약이 평면으로 온다)은 행 자체를 요약으로
 * 읽는다. 서버 #378이 prod까지 나간 뒤에는 지워도 되는 호환 경로다.
 */
function toEventApplication(res: EventApplicationResponse): EventApplication {
  const participant = res.participant;
  const application =
    res.application ?? (res as unknown as FormResponseSummaryResponse);
  return {
    response: toFormResponseItem(application),
    participant:
      participant?.eventPtcpId != null && participant.ptcpSttsCd
        ? { eventPtcpId: participant.eventPtcpId, ptcpSttsCd: participant.ptcpSttsCd }
        : null,
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
    rvwPrcsSeCd: res.rvwPrcsSeCd,
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
    planDt: res.planYmd ?? null,
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
 * GET /v1/events/{eventId}/applications — 행사에 들어온 신청 (#145 · 서버 #158 · #378).
 *
 * **행사 API인데 이 파일에 있는 이유**는 돌려주는 것의 몸통이 참가자가 아니라 폼 응답이기
 * 때문이다. 서버도 폼 응답 조회에 위임한 요약을 `application`으로 감싸 내려줄 뿐이라 그 안의
 * DTO가 위의 것과 같다 — `entities/event` 쪽에 같은 모양을 한 번 더 옮겨 적으면 계약이 바뀌는
 * 날 한쪽만 고쳐진다. (엔티티 슬라이스끼리는 서로 참조하지 않으므로, 모양을 아는 파일에
 * 호출을 둔다.)
 *
 * 폼 응답 목록과 다른 점은 **권한이 `EVENT_MANAGE`라는 것**(D8 — 폼 전체 권한 `RESPONSE_REVIEW`가
 * 없는 행사 운영자도 자기 행사의 신청은 볼 수 있어야 한다)과, 행마다 **명단 등록 여부
 * (`participant`)가 함께 온다는 것**이다(ssccops#307).
 *
 * 폼이 연결되지 않은 행사는 빈 배열이 아니라 409 `EVENT_HAS_NO_FORM`으로 온다 — 빈 목록은
 * "아직 신청이 없다"로 읽히지만 실제로는 신청을 받을 수단 자체가 없는 상태라, 운영자가 해야
 * 할 일이 전혀 다르다. 문구는 features/event의 오류 매핑이 맡는다.
 */
export async function fetchEventApplications(
  eventId: number,
  filter: FormResponseListFilter = {},
): Promise<EventApplication[]> {
  const query = new URLSearchParams();
  if (filter.rspnsSttsCd) query.set("statusCode", filter.rspnsSttsCd);

  const qs = query.toString();
  const base = `/v1/events/${eventId}/applications`;
  const items = await apiFetch<EventApplicationResponse[] | null>(
    qs ? `${base}?${qs}` : base,
  );
  return (items ?? []).map(toEventApplication);
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

/** 한 번에 띄우는 요청 수 — 브라우저의 호스트당 연결 한도(6)에 맞춘다 */
const DETAIL_CONCURRENCY = 6;

export interface FormResponseDetailsResult {
  /** formRspnsId → 상세. 실패한 건은 없다 */
  details: Record<number, FormResponseDetail>;
  /** 못 받은 건수 — 부르는 쪽이 문구를 정한다 */
  failures: number;
}

/**
 * 여러 응답의 상세를 모아 온다.
 *
 * **답을 여러 건 한 번에 주는 엔드포인트가 없어서** 상세를 건수만큼 부른다. 서버가 목록에
 * 응답 내용을 싣지 않기로 계약했고(`FormResponseSummaryResponse`: *"답이 필요하면 상세를
 * 부른다"*) 그 계약을 화면 사정으로 뒤집지 않는다 — 응답 한 건의 답 상한이 10만 자이고 목록에는
 * 페이징이 없어(ssccops-server#37), 목록에 답을 실으면 매일 쓰는 심사 목록이 그 상한을 그대로
 * 짊어진다.
 *
 * **엔티티 API에 두는 이유**: 이 "여러 번 부르기"를 쓰는 곳이 둘이다 — 표 보기(ssccops#227의
 * `useResponseAnswers`)와 CSV 내보내기(ssccops#223). 훅 안에 두면 CSV 쪽이 같은 워커 풀을 한 벌
 * 더 쓰게 되고, 그때 동시 실행 수·실패 처리가 두 곳에서 따로 움직인다. **나중에 서버가 표
 * 보기용 조회를 열면 바꿀 곳은 이 함수 하나다** — 선택지는 ssccops#227에 A·B·C로 정리돼 있다.
 *
 * 워커를 `DETAIL_CONCURRENCY`개 띄우고 각자 다음 번호를 집어 간다. 배열을 미리 잘라 나누면
 * 느린 한 건이 그 조각 전체를 붙잡지만, 이렇게 하면 먼저 끝난 워커가 남은 것을 계속 가져간다.
 *
 * **한 건이 실패해도 나머지를 버리지 않는다** — 몇 건이 빠졌는지만 돌려주고, 그것을 오류로 볼지
 * 안내로 볼지는 부르는 쪽이 정한다(표는 빈 칸으로 그리고 CSV는 내보내기를 멈춘다).
 *
 * @param onProgress 몇 건까지 왔는지 — 수십 건이면 눈에 띄게 걸려 화면이 멈춘 것처럼 보인다
 * @param isAlive false가 되면 남은 요청을 더 띄우지 않는다 (화면이 떠난 뒤 계속 부르지 않게)
 */
export async function fetchFormResponseDetails(
  formId: number,
  formRspnsIds: readonly number[],
  onProgress?: (done: number) => void,
  isAlive: () => boolean = () => true,
): Promise<FormResponseDetailsResult> {
  const details: Record<number, FormResponseDetail> = {};
  let failures = 0;
  let done = 0;
  let cursor = 0;

  const worker = async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= formRspnsIds.length || !isAlive()) return;

      const id = formRspnsIds[index];
      try {
        details[id] = await fetchFormResponse(formId, id);
      } catch {
        failures += 1;
      }
      done += 1;
      if (isAlive()) onProgress?.(done);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, formRspnsIds.length) }, worker),
  );

  return { details, failures };
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
