import type { FormSummary } from "../model/types";
import { fetchForms } from "./forms";

/*
 * 기획안 폼을 찾는 경로 (ssccops-server #173 · ssccops#131).
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
 * ── 목록에서 고르는 것이 유일한 길이다 ───────────────────────
 * 서버에 `sysFormCd`로 폼을 찾는 전용 경로는 없다. `sysFormCd`를 싣는 응답은 폼 목록
 * (`GET /v1/forms`)과 폼 상세(`GET /v1/forms/{formId}`) 둘뿐이고, 상세는 이미 번호를 알아야
 * 부를 수 있으므로 남는 것은 목록이다.
 *
 * **그래서 이 조회에는 폼 조회(FORM_READ) 권한이 필요하다.** 응답자용 경로
 * (`GET /v1/forms/{formId}/public`)는 권한을 묻지 않지만 그쪽도 번호를 먼저 알아야 한다.
 * 권한이 없는 회원에게는 403이 오며, 호출부는 그것을 오류가 아니라 "아직 열어 볼 수 없다"로
 * 갈라 안내한다(features/proposal/model/proposal-error.ts).
 */

/** 코드가 기획안 폼을 가리키는 값 — 서버 `ProposalFormSeed.SYSTEM_FORM_CODE`와 같은 문자열이다 */
export const PROPOSAL_SYS_FORM_CD = "PROPOSAL";

/**
 * 기획안 폼 한 건. 아직 시드되지 않았거나 다른 코드로 세워졌으면 `null`이다.
 *
 * 목록에서 **첫 번째로 맞는 것**을 고르지 않고 그냥 찾는 것은, 한 코드가 가리키는 폼이 환경당
 * 하나임을 서버의 UNIQUE 제약이 보장하기 때문이다(서버 `FormUniqueConstraintTest`). 웹이 여러
 * 건을 가정해 고르는 규칙을 따로 두면 그 규칙이 서버와 갈릴 자리가 생긴다.
 */
export async function findProposalForm(): Promise<FormSummary | null> {
  const forms = await fetchForms();
  return forms.find((form) => form.sysFormCd === PROPOSAL_SYS_FORM_CD) ?? null;
}
