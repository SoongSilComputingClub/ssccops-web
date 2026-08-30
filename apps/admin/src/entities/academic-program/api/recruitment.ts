import type { PtcpSttsCd, RspnsSttsCd } from "@/shared/config/codes";
import { apiFetch, apiFetchList } from "@/shared/lib/api/client";
import type {
  RecruitmentApplication,
  RecruitmentApplicationFilter,
  RecruitmentSelection,
  RecruitmentTeamMember,
} from "../model/types";

/*
 * 모집 신청자 조회·선발 API (#127 · ssccops-server #138).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼·업무 도메인이 잡아 둔 규칙
 * 그대로다. 여기서 도메인 타입으로 옮기고 나면 계약이 바뀌었을 때 고칠 곳은 아래 `to*`
 * 함수뿐이다.
 *
 * ── 신청자는 폼 응답이다 ─────────────────────────────────────
 * 모집 신청은 시스템 폼 한 건으로 처리하기로 했다(2026-08-28 확정). 학술 쪽에 신청 화면을
 * 따로 만들지 않고, 이 화면은 그 폼 응답을 신청자로 읽는다 — 서버도 새 DTO를 만들지 않고
 * 기존 `FormResponseSummaryResponse`를 그대로 돌려준다(entities/response 의 것과 같은 모양).
 * `entities/response` 쪽에 같은 모양을 한 번 더 옮겨 적지 않는 이유와 같다(엔티티 슬라이스
 * 끼리는 서로 참조하지 않으므로, 모양을 아는 파일에 호출을 둔다).
 *
 * ── 인가가 두 호출에서 갈린다 ────────────────────────────────
 *  - GET .../recruitment/applications — 소유권(isLeader) 또는 ACADEMIC_PROGRAM_MANAGE.
 *    애노테이션이 없고 서비스가 스터디장 본인/국장으로 끊는다. 이 화면은 국장 전용이다.
 *  - POST .../recruitment/select      — ACADEMIC_PROGRAM_MANAGE (학술국장 전용).
 *    스터디장은 선발에 관여하지 않는다(2026-08-23 확정 — 최초 설계 정정).
 *
 * ── 모집 시작 전에는 두 호출이 409다 ────────────────────────
 * 활동이 ONGOING 이전(APPROVED)이면 `RECRUITMENT_NOT_STARTED`(409)로 온다 — 모집 시작
 * (START_RECRUITMENT 전이 · academic-programs.ts)이 선행이다.
 */

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 모집 신청자 조회·선발이 돌려주는 오류 코드 (ssccops-server AcademicProgramErrorCode).
 *
 * `AUTHORITY_REQUIRED`·`FORBIDDEN`(소유권)·`VALIDATION_FAILED`는 activity 전이와 같은 뜻이라
 * academic-programs.ts 의 `ACADEMIC_PROGRAM_ERROR`가 이미 갖고 있다 — 여기는 이 화면에서만
 * 새로 나오는 코드만 더한다.
 */
export const RECRUITMENT_ERROR = {
  /** 모집 시작(START_RECRUITMENT) 전에 신청자 조회·선발을 불렀다 (409) */
  RECRUITMENT_NOT_STARTED: "RECRUITMENT_NOT_STARTED",
  /** START_RECRUITMENT 인데 연결된 폼에 문항이 하나도 없다 (400 · 폼 도메인 코드를 그대로 전파) */
  FORM_HAS_NO_QUESTION: "FORM_HAS_NO_QUESTION",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

/** 신청자 요약 안에 실리는 응답자 회원 블록 (서버가 mbr 을 조인해 채운다) */
interface RecruitmentApplicantResponse {
  mbrId: number | null;
  mbrNm: string | null;
  stdntNo: string | null;
  scsbjtNm: string | null;
}

/**
 * 신청자 한 줄 (RecruitmentApplicationResponse · 서버 #198).
 *
 * 폼 응답 요약에 **참가 상태**(`eventPtcpId`·`ptcpSttsCd`)를 얹은 모집 전용 응답이다.
 * #127까지는 `FormResponseSummaryResponse`를 그대로 받았는데, 그 DTO로는 확정과 대기를
 * 가를 수 없었다(#209 — 선발이 심사와 등록을 함께 해서 둘 다 응답이 `ACCEPTED`가 된다).
 *
 * `rspnsCn`(응답 내용)은 여전히 목록에 실리지 않는다 — 지원 동기 같은 답 본문은 이 요약에
 * 없고, 필요하면 폼 응답 상세를 따로 조회해야 한다(이 화면 범위 밖 · #127 결정).
 */
interface RecruitmentApplicationResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  responseTitle: string | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnDt: string | null;
  member: RecruitmentApplicantResponse | null;
  /** 선발 전이면 null (서버가 대체값을 만들지 않는다) */
  eventPtcpId: number | null;
  ptcpSttsCd: PtcpSttsCd | null;
}

/**
 * 선발 응답 한 줄 (AcademicProgramMemberResponse).
 *
 * `GET .../members`(#131)와 같은 모양이다 — 선발이 끝난 뒤의 팀원 목록을 그대로 돌려준다.
 * 서버 이슈 #138 본문은 `List<MemberResponse>`라고만 적었으나 #127 이슈가 이 필드 집합을
 * 명시했다. 배포에 따라 필드명이 흔들릴 수 있어 옵셔널로 받아 굳힌다.
 */
interface RecruitmentTeamMemberResponse {
  eventPtcpId: number;
  mbrId: number | null;
  mbrNm: string | null;
  ptcpSttsCd: PtcpSttsCd;
  isLeader: boolean;
  joinedAt: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toApplication(
  res: RecruitmentApplicationResponse,
): RecruitmentApplication {
  return {
    formRspnsId: res.formRspnsId,
    // 순번을 모르는 배포에서 1이라고 지어내지 않는다 — 없으면 화면이 표기를 뺀다
    rspnsSeq: res.rspnsSeq ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnDt: res.sbmsnDt,
    // 빈 이름을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    memberId: res.member?.mbrId ?? null,
    memberName: res.member?.mbrNm ?? "",
    studentNo: res.member?.stdntNo ?? null,
    subjectName: res.member?.scsbjtNm ?? null,
    /*
     * 선발 전이면 null이고 그것이 정상이다(서버 #198). 이 필드를 아직 안 싣는 배포에서도
     * 같은 자리로 떨어져 화면이 "미선발"로 그린다 — 없는 값을 지어내지 않는다.
     */
    ptcpSttsCd: res.ptcpSttsCd ?? null,
    eventParticipantId: res.eventPtcpId ?? null,
  };
}

function toTeamMember(
  res: RecruitmentTeamMemberResponse,
): RecruitmentTeamMember {
  return {
    eventParticipantId: res.eventPtcpId,
    memberId: res.mbrId ?? null,
    memberName: res.mbrNm ?? "",
    ptcpSttsCd: res.ptcpSttsCd,
    isLeader: res.isLeader,
    joinedAt: res.joinedAt,
  };
}

/* ── 신청자 목록 ───────────────────────────────────────────── */

/**
 * GET /v1/academic-programs/{academicProgramId}/recruitment/applications — 신청자 (#127 · #138).
 *
 * `List<FormResponseSummaryResponse>` + `page` 봉투라 `apiFetchList` 를 쓴다. `statusCode`
 * (ResponseStatus)로 거를 수 있다 — 작성 중(DRAFT)은 서버가 기본 조회에서 뺀다(폼 응답
 * 목록과 같은 규칙). 커서 페이징이므로 페이지 번호는 없고 `hasNext`·`nextCursor` 로 이어 받는다.
 *
 * 모집 시작 전(활동이 APPROVED)이면 409 `RECRUITMENT_NOT_STARTED` — 화면은 그때 신청자 표
 * 대신 "모집을 먼저 시작하세요" 안내를 그린다.
 */
export async function fetchRecruitmentApplications(
  academicProgramId: number,
  filter: RecruitmentApplicationFilter = {},
): Promise<{
  applications: RecruitmentApplication[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
}> {
  const query = new URLSearchParams();
  if (filter.rspnsSttsCd) query.set("statusCode", filter.rspnsSttsCd);
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));

  const qs = query.toString();
  const base = `/v1/academic-programs/${academicProgramId}/recruitment/applications`;
  const { data, page } = await apiFetchList<RecruitmentApplicationResponse>(
    qs ? `${base}?${qs}` : base,
  );

  return {
    applications: data.map(toApplication),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
  };
}

/* ── 선발 확정 ─────────────────────────────────────────────── */

/**
 * POST /v1/academic-programs/{academicProgramId}/recruitment/select — 선발 확정 (#127 · #138).
 *
 * 폼 응답 심사(ACCEPTED) + `event_ptcp` 등록(CONFIRMED/WAITLISTED)을 한 요청으로 처리한다 —
 * 두 경로로 나누면 응답은 승인됐는데 명단에 안 오른 신청자가 남을 수 있다. `ACADEMIC_PROGRAM_MANAGE`
 * (학술국장 전용) — 스터디장이 부르면 403이다.
 *
 * `selections` 의 `ptcpSttsCd` 는 **CONFIRMED · WAITLISTED 만** 받는다(취소로 시작하는 선발은
 * 계약에 없다 — `PTCP_RGST_STTS_CDS`). 정원 초과는 서버가 막지 않고 경고만이라(참고치 원칙),
 * 화면이 정원 대비 초과를 표시하되 요청을 끊지는 않는다.
 *
 * **응답 본문(갱신된 팀원 목록)을 화면 상태로 그대로 쓰지 않는다** — 선발 성공 뒤 화면은
 * 신청자 목록을 다시 조회해 맞춘다(AGENTS.md "부분 갱신과 재조회를 가른다"). 선발 한 번이
 * 신청자 상태·팀원 명단·정원 소진을 함께 움직이는데 그 파생값을 화면이 다시 셀 수 없다.
 * 팀원 목록은 응답으로 갈아 끼워 곧바로 보여 준다(그 목록은 서버가 다시 세어 준 값이다).
 */
export async function selectRecruitmentApplicants(
  academicProgramId: number,
  selections: RecruitmentSelection[],
): Promise<RecruitmentTeamMember[]> {
  const res = await apiFetch<RecruitmentTeamMemberResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/recruitment/select`,
    {
      method: "POST",
      body: JSON.stringify({
        selections: selections.map((s) => ({
          formRspnsId: s.formRspnsId,
          ptcpSttsCd: s.ptcpSttsCd,
        })),
      }),
    },
  );

  return (res ?? []).map(toTeamMember);
}
