import type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";
import { apiFetchAuthed, apiFetchAuthedNullable } from "@/shared/api/authed-client";
import type { PtcpSttsCd, RspnsSttsCd } from "@/shared/config/codes";
import type {
  RecruitmentApplicant,
  RecruitmentApplication,
  RecruitmentApplicationDetail,
} from "../model/types";

export { RECRUITMENT_APPLICATION_ERROR } from "../model/error-codes";

/*
 * 지원자 목록·지원서 상세 조회 (#826 · ssccops#625) — **서버 컴포넌트 전용**.
 *
 *   GET /v1/academic-programs/{id}/recruitment/applications                 목록 (server#138 · #198)
 *   GET /v1/academic-programs/{id}/recruitment/applications/{formRspnsId}   상세 (server#704)
 *
 * ── 왜 폼 응답 경로(`/v1/forms/{formId}/responses`)가 아닌가 ──────────
 * 그 경로는 응답 심사 권한(RESPONSE_REVIEW)이 있어야 열리고, 리더 역할에는 권한을 붙일 수 없다
 * (ADR-0067). 그래서 학술 경로가 «이 프로그램의 리더인가»로 끊는다 — 소개 글 편집(ADR-0069)과
 * 같은 모양이다. 상세는 리더 한 사람만, 목록은 리더 또는 학술 조회 권한이다(ADR-0068).
 *
 * ── 쓰기가 없다 ────────────────────────────────────────────
 * 선발·심사는 학술국장이 어드민에서 한다. 이 앱에는 짝이 되는 `*-write.ts`가 없다.
 *
 * ── 서버 전용이다 — 배럴에서 재export 하지 않는다 ─────────────
 * `apiFetchAuthed`가 `next/headers`(쿠키)를 타므로 클라이언트 컴포넌트가 배럴로 이 모듈을
 * 끌어오면 빌드가 깨진다(`recruitment-form-read.ts`와 같은 규칙). 로더가 이 경로에서 직접 임포트한다.
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나다** — 조회만 있어 변환을 따로 떼지 않았다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

/** 목록 줄의 회원 블록 (`ResponseMemberSummary`) — 등급·상태 코드도 오지만 이 화면은 그리지 않는다 */
interface ApplicantApiResponse {
  mbrId: number;
  mbrNm: string | null;
  stdntNo: string | null;
  scsbjtNm: string | null;
}

/** 상세의 회원 블록 — 목록에 기수·학년을 더한 것. **연락처 필드가 없다**(server#704) */
interface ApplicantDetailApiResponse extends ApplicantApiResponse {
  genNo: number | null;
  scyrNo: number | null;
}

/** 서버 `RecruitmentApplicationResponse` */
interface RecruitmentApplicationApiResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnDt: string | null;
  member: ApplicantApiResponse;
  eventPtcpId: number | null;
  ptcpSttsCd: PtcpSttsCd | null;
}

/** 서버 `RecruitmentApplicationDetailResponse` (server#704) — 검토 이력·제출 회차는 싣지 않는다 */
interface RecruitmentApplicationDetailApiResponse {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnDt: string | null;
  member: ApplicantDetailApiResponse;
  qitemCpstCn: QitemCpstCn | null;
  rspnsCn: RspnsCn | null;
  eventPtcpId: number | null;
  ptcpSttsCd: PtcpSttsCd | null;
  prevFormRspnsId: number | null;
  nextFormRspnsId: number | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/*
 * 없는 값을 만들어 내지 않는다(루트 AGENTS.md) — 빈 이름을 «-»로 채우는 것은 뷰의 표시 규칙이다.
 * 선발 상태가 null이면 그대로 null이다(«미선발»은 뷰가 읽는다).
 */
function toApplicant(res: ApplicantApiResponse): RecruitmentApplicant {
  return {
    memberId: res.mbrId,
    memberName: res.mbrNm ?? "",
    studentNo: res.stdntNo ?? null,
    subjectName: res.scsbjtNm ?? null,
  };
}

function toApplication(res: RecruitmentApplicationApiResponse): RecruitmentApplication {
  return {
    formRspnsId: res.formRspnsId,
    rspnsSeq: res.rspnsSeq ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnDt: res.sbmsnDt,
    applicant: toApplicant(res.member),
    ptcpSttsCd: res.ptcpSttsCd ?? null,
  };
}

/*
 * 문항 구성·답이 비어 오면 빈 자리로 둔다 — 그리는 쪽이 «문항이 없습니다»로 읽는다.
 * 편집기(`response-mapping.ts`)처럼 빈 페이지를 하나 지어 넣지 않는다. 그쪽은 «보고 있는 페이지»가
 * 있어야 그려지는 편집 화면이고, 여기는 문항을 차례로 읽기만 한다.
 */
function toDetail(res: RecruitmentApplicationDetailApiResponse): RecruitmentApplicationDetail {
  return {
    formRspnsId: res.formRspnsId,
    rspnsSeq: res.rspnsSeq ?? null,
    rspnsSttsCd: res.rspnsSttsCd,
    sbmsnDt: res.sbmsnDt,
    applicant: {
      ...toApplicant(res.member),
      generationNumber: res.member.genNo ?? null,
      academicYear: res.member.scyrNo ?? null,
    },
    ptcpSttsCd: res.ptcpSttsCd ?? null,
    qitemCpstCn: {
      pages: res.qitemCpstCn?.pages ?? [],
      qitems: res.qitemCpstCn?.qitems ?? [],
    },
    rspnsCn: res.rspnsCn ?? {},
    prevFormRspnsId: res.prevFormRspnsId ?? null,
    nextFormRspnsId: res.nextFormRspnsId ?? null,
  };
}

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * 지원자 목록 — 작성 중(DRAFT)을 뺀 전부, 제출 일시 내림차순(서버 기본 · 화면이 다시 정렬하지 않는다).
 * 페이징이 없어 배열 그대로 온다(server#138 — 폼 응답 목록과 같은 결정).
 */
export async function fetchRecruitmentApplications(
  academicProgramId: number,
): Promise<RecruitmentApplication[]> {
  const res = await apiFetchAuthedNullable<RecruitmentApplicationApiResponse[]>(
    `/v1/academic-programs/${academicProgramId}/recruitment/applications`,
  );
  return (res ?? []).map(toApplication);
}

/** 지원서 한 건 — 리더 한 사람만 받는다(server#704) */
export async function fetchRecruitmentApplication(
  academicProgramId: number,
  formRspnsId: number,
): Promise<RecruitmentApplicationDetail> {
  const res = await apiFetchAuthed<RecruitmentApplicationDetailApiResponse>(
    `/v1/academic-programs/${academicProgramId}/recruitment/applications/${formRspnsId}`,
  );
  return toDetail(res);
}
