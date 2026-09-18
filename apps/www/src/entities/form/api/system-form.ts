import { apiFetchAuthed } from "@/shared/api/authed-client";

/*
 * 시스템 폼 조회 (#518 · `GET /v1/forms/system/{sysFormCd}` · 서버 컴포넌트 전용).
 *
 * ── 왜 이 조회가 필요한가 ────────────────────────────────────
 * `/me`의 «낸 폼»은 `GET /v1/forms/responses/mine`으로 그리는데, 그 목록 항목에는 **어느 폼이
 * 시스템 폼인지가 실려 있지 않다**(`MyFormResponseOverviewResponse` — formId·formKey·제목·
 * 라벨뿐). 기획안 응답에 «기획안» 칩을 달려면 기획안 폼의 `formId`를 알아야 하고, 그 값은
 * IDENTITY라 환경마다 다르다. 그래서 lms 재제출 화면이 쓰는 이 조회로 코드(`PROPOSAL`)에서
 * `formId`를 얻어 목록의 `formId`와 견준다. 목록 항목에 없는 값을 화면이 지어내지 않는다.
 *
 * 인증만 요구한다 — `sysFormCd`를 싣는 운영자용 조회(`GET /v1/forms`)는 FORM_READ 권한이라
 * 일반 회원이 부를 수 없다. 없는 코드(아직 시드되지 않음)는 404이고, 그때 `/me`는 칩만 뺀다.
 *
 * 응답에는 문항 구성(`qitemCpstCn`)도 실리지만 이 앱은 쓰지 않아 받지 않는다.
 */

interface SystemFormApiResponse {
  formId: number;
  formKey?: string | null;
  formTtlNm: string | null;
  sysFormCd: string;
}

/** 시스템 폼 한 건 — `/me`가 필요한 식별자만 */
export interface SystemFormRef {
  formId: number;
  formKey: string | null;
  formTtlNm: string;
  sysFormCd: string;
}

/** GET /v1/forms/system/{sysFormCd} — 코드로 시스템 폼 한 건 */
export async function fetchSystemForm(sysFormCd: string): Promise<SystemFormRef> {
  const res = await apiFetchAuthed<SystemFormApiResponse>(
    `/v1/forms/system/${encodeURIComponent(sysFormCd)}`,
  );
  return {
    formId: res.formId,
    formKey: res.formKey ?? null,
    formTtlNm: res.formTtlNm ?? "",
    sysFormCd: res.sysFormCd,
  };
}
