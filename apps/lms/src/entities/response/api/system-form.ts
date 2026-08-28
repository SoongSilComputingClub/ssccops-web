import type { QitemCpstCn } from "@ssccops/form-renderer";
import { apiFetchAuthed } from "@/shared/api/authed-client";
import type { SystemForm } from "../model/types";
export { PROPOSAL_SYS_FORM_CD } from "../model/system-form-code";

/*
 * 시스템 폼 조회 (서버 신설 · `GET /v1/forms/system/{sysFormCd}` · 서버 컴포넌트 전용).
 *
 * ── 왜 이 조회가 필요한가 ────────────────────────────────────
 * 기획안 폼은 `sys_form_cd = 'PROPOSAL'`이 가리키는 시스템 폼이고 `formId`는 환경마다 다르다
 * (IDENTITY). 화면에 숫자를 적으면 한 환경에서만 맞고 나머지에서는 남의 폼이 열린다 — 어드민
 * `entities/form/api/proposal-form.ts`가 폼 목록에서 코드로 찾는 것과 같은 판단이다.
 *
 * **어드민과 갈리는 자리: 폼 목록을 못 읽는다.** 어드민은 `GET /v1/forms`(FORM_READ 권한)에서
 * 찾지만, 이 앱은 일반 회원이 기획안을 내는 화면이라 그 권한이 없다. 그래서 인증만 요구하는
 * 전용 조회를 쓴다(응답자용 `GET .../public`·`GET .../responses/mine`이 세운 규칙과 같다).
 *
 * `qitemCpstCn`을 함께 받는 것은 재제출 화면이 **마감된 폼의 문항도 그려야** 하기 때문이다 —
 * `CHANGES_REQUESTED` 재제출은 접수 마감에 막히지 않는데(서버 #177), `GET .../public`은 마감
 * 시 409라 문항을 내려주지 않는다.
 */

interface SystemFormApiResponse {
  formId: number;
  formTtlNm: string;
  sysFormCd: string;
  mltplRspnsYn: boolean;
  acceptingYn: boolean;
  qitemCpstCn: QitemCpstCn | null;
}

/**
 * GET /v1/forms/system/{sysFormCd} — 코드로 시스템 폼 한 건.
 *
 * 없는 코드(아직 시드되지 않았거나 지워졌음)는 404 `FORM_NOT_FOUND`다 — 호출부(로더)가 그것을
 * "폼이 아직 준비되지 않았다"로 갈라 안내한다.
 */
export async function fetchSystemForm(sysFormCd: string): Promise<SystemForm> {
  const res = await apiFetchAuthed<SystemFormApiResponse>(
    `/v1/forms/system/${encodeURIComponent(sysFormCd)}`,
  );
  return {
    formId: res.formId,
    formTtlNm: res.formTtlNm,
    sysFormCd: res.sysFormCd,
    mltplRspnsYn: res.mltplRspnsYn,
    acceptingYn: res.acceptingYn,
    // 문항 구성이 비어 오는 배포에서 화면이 옵셔널 체이닝으로 뒤덮이지 않게 자리를 채운다
    qitemCpstCn: res.qitemCpstCn ?? { pages: [], qitems: [] },
  };
}
