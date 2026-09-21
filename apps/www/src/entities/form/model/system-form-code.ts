/*
 * 시스템 폼 코드 상수 — **순수 모듈**(전송 계층 무의존 · lms와 같은 배치).
 *
 * `api/system-form.ts`에 두면 그 파일이 `next/headers`를 끌어와, 배럴이 이 상수 하나를
 * 재export 하려 해도 서버 모듈이 함께 딸려 온다. 코드값만 따로 뽑아 둔다.
 */

/** 기획안 폼을 가리키는 코드 — 서버 `ProposalFormSeed.SYSTEM_FORM_CODE`와 같은 문자열 */
export const PROPOSAL_SYS_FORM_CD = "PROPOSAL";

/** 신입회원 모집 지정 폼 — 서버 `DesignatableSystemForm.RECRUIT`와 같은 문자열 (#588 · ADR-0044) */
export const RECRUIT_SYS_FORM_CD = "RECRUIT";

/**
 * 이 앱(`/f/{key}`)이 직접 문항을 그리고 답을 받는 시스템 폼인가 (#588 · ssccops#436 · ADR-0044).
 *
 * #555에서 «시스템 폼(`sysFormCd` 있음)은 문항을 그리지 않고 LMS로 보낸다»로 두었는데, 신입회원
 * 모집이 «지정 폼»이 되면서 **시스템 폼인데 이 앱이 곧 지원서인** 폼이 생겼다 — 어드민 «시스템 폼»
 * 페이지에서 지정한 폼의 공개 링크가 `/join`의 «지원하기»다. 그 폼까지 LMS로 튕기면 지원자가
 * 학술 앱에 떨어진다.
 *
 * 허용 목록(이 앱이 받는 코드)으로 둔 것은 기본값을 #555 그대로(LMS로) 두기 위해서다 — 모르는
 * 코드는 «LMS가 쓰는 폼»이라는 안내가 «안내 없는 문항»보다 안전하다. 새 코드가 이 앱에서 답을
 * 받게 되면 여기 한 줄을 더한다.
 */
export function answersOnWww(sysFormCd: string): boolean {
  return sysFormCd === RECRUIT_SYS_FORM_CD;
}
