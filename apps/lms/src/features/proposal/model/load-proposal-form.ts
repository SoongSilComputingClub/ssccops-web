import type { QitemCpstCn } from "@/entities/response";
import { RESPONSE_ERROR } from "@/entities/response";
// 서버 전용 조회는 배럴이 재export 하지 않는다(클라 번들 오염 방지) — 직접 임포트한다
import {
  fetchSystemForm,
  PROPOSAL_SYS_FORM_CD,
} from "@/entities/response/api/system-form";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { ApiError } from "@/shared/api/client";
import { loadProposalErrorMessage } from "./proposal-error";

/*
 * 기획안 신규 작성 화면의 SSR 로더 (#185).
 *
 * ── 무엇을 모으는가 ────────────────────────────────────────
 * 기획안 폼(`sys_form_cd = 'PROPOSAL'`) 한 건 — `formId`·문항 구성(`qitemCpstCn`)·지금
 * 새 응답을 받는가(`acceptingYn`). 초안 복원·자동 저장·제출은 마운트되는 클라이언트 폼이
 * 브라우저 통로로 직접 한다(#171 재제출 폼과 같은 셸+폼 구조).
 *
 * ── 왜 훅이 아니라 로더인가 ──────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · www·#128·#171). 쿠키의 Supabase 세션을
 * 서버에서 읽어 토큰을 브라우저 코드에 싣지 않는다.
 *
 * ── 접수 불가를 로더가 가르지 않는다 ────────────────────────
 * 시스템 폼 조회(`GET /v1/forms/system/{sysFormCd}`)는 접수 중이 아니어도 200이다(어드민의
 * `GET .../public`이 409로 끊는 것과 갈리는 자리다 — 재제출 화면이 마감된 폼 문항을 그려야
 * 하기 때문). `acceptingYn`을 그대로 넘겨 뷰가 "접수 중이 아님" 안내와 작성 폼을 가른다.
 *
 * 폼 조회가 404 `FORM_NOT_FOUND`면 아직 시드되지 않은 것이라 "폼이 준비되지 않았다"로 갈라
 * 안내한다(다시 시도 버튼을 주지 않는다 — 운영진이 세워야 한다).
 */

export type ProposalFormLoad =
  | {
      outcome: "ready";
      formId: number;
      formTtlNm: string;
      /** 지금 새 기획안을 받는가 — false면 뷰가 작성 폼 대신 접수 안내를 그린다 */
      acceptingYn: boolean;
      qitemCpstCn: QitemCpstCn;
    }
  /** 기획안 폼이 아직 세워지지 않았다 */
  | { outcome: "not-seeded" }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(네트워크·설정 등) */
  | { outcome: "error"; message: string };

export async function loadProposalForm(): Promise<ProposalFormLoad> {
  try {
    const form = await fetchSystemForm(PROPOSAL_SYS_FORM_CD);
    return {
      outcome: "ready",
      formId: form.formId,
      formTtlNm: form.formTtlNm,
      acceptingYn: form.acceptingYn,
      qitemCpstCn: form.qitemCpstCn,
    };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    if (
      error instanceof ApiError &&
      error.code === RESPONSE_ERROR.FORM_NOT_FOUND
    ) {
      return { outcome: "not-seeded" };
    }
    return { outcome: "error", message: loadProposalErrorMessage(error) };
  }
}
