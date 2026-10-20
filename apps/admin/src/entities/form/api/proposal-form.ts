import type { QitemCpstCn } from "@ssccops/form-renderer";
import { ApiError, apiFetch } from "@/shared/lib/api/client";
import type { SystemForm } from "../model/types";
import { PROPOSAL_SYS_FORM_CD } from "../model/system-form-code";
import { FORM_ERROR, toQitemComposition } from "./forms";

/*
 * 기획안 폼을 찾는 경로 (ssccops-server #173 · ssccops#131 → 경로 교체 #814).
 *
 * ── 왜 formId를 화면에 적지 않는가 ─────────────────────────────
 * `form_id`는 IDENTITY라 로컬·dev·prod에서 값이 다르다. 화면에 숫자를 적어 두면 한 환경에서만
 * 맞고 나머지에서는 **남의 폼이 열린다** — 없는 폼이면 404라도 뜨지만, 그 번호에 다른 폼이
 * 들어 있으면 아무 경고 없이 엉뚱한 문항이 그려진다. 그래서 코드가 폼을 가리키는 유일한 값은
 * `sys_form_cd`이고(서버 #140이 세운 규칙이다), 웹도 같은 값으로 찾는다.
 *
 * 환경변수로 번호를 빼는 것도 같은 이유로 하지 않는다. 값이 바뀌는 자리가 코드에서 배포 설정
 * 으로 옮겨갈 뿐, 어느 환경의 어느 번호가 기획안 폼인지는 여전히 사람이 손으로 맞춰야 한다.
 *
 * ── 폼 목록이 아니라 회원용 시스템 폼 조회로 찾는다 (#814) ─────────
 * 예전에는 폼 목록(`GET /v1/forms`)에서 코드로 골랐고, 그 목록은 폼 조회(FORM_READ) 권한을
 * 요구했다. 국원이 학술 프로그램 조회(ACADEMIC_PROGRAM_READ)만으로 기획안 검토를 읽게 되면서
 * (서버 #694 · ADR-0068) 그 권한이 걸림돌이 됐다 — 국원에게 FORM_READ를 주면 폼 관리 화면
 * 전체가 열린다. `GET /v1/forms/system/{sysFormCd}`는 **인증만** 요구하고 문항 구성까지 싣는다
 * (lms 재제출 화면이 이미 쓰는 경로다). 그래서 폼 상세(`GET /v1/forms/{formId}` · FORM_READ)를
 * 따로 부를 필요도 없어졌다.
 */

/* 코드값 자체는 `model/system-form-code.ts`로 옮겼다(#588) — 모집 코드와 한 표에서 갈린다 */
export { PROPOSAL_SYS_FORM_CD };

/** 서버 `SystemFormResponse` 그대로 (formKey는 어드민이 쓰지 않아 옮기지 않는다) */
interface SystemFormResponse {
  formId: number;
  formTtlNm: string;
  sysFormCd: string;
  mltplRspnsYn: boolean;
  acceptingYn: boolean;
  qitemCpstCn: Partial<QitemCpstCn> | null;
}

/**
 * 기획안 폼 한 건. 아직 시드되지 않았거나 지워졌으면 `null`이다.
 *
 * 없는 코드는 서버가 404 `NOT_FOUND`(`FORM_ERROR.FORM_NOT_FOUND`)로 답한다 — 그것만 `null`로
 * 바꾸고 나머지 실패는 그대로 던진다. 한 코드가 가리키는 폼은 환경당 하나다(서버 UNIQUE 제약).
 */
export async function findProposalForm(): Promise<SystemForm | null> {
  try {
    const res = await apiFetch<SystemFormResponse>(
      `/v1/forms/system/${encodeURIComponent(PROPOSAL_SYS_FORM_CD)}`,
    );
    return {
      formId: res.formId,
      formTtlNm: res.formTtlNm,
      sysFormCd: res.sysFormCd,
      mltplRspnsYn: res.mltplRspnsYn,
      acceptingYn: res.acceptingYn,
      qitemCpstCn: toQitemComposition(res.qitemCpstCn),
    };
  } catch (error) {
    if (error instanceof ApiError && error.code === FORM_ERROR.FORM_NOT_FOUND) return null;
    throw error;
  }
}
