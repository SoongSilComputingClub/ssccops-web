import type { MyFormResponse } from "@/entities/response";
// 서버 전용 조회는 배럴이 재export 하지 않는다(클라 번들 오염 방지) — 직접 임포트한다
import { fetchMyFormResponses } from "@/entities/response/api/my-responses";
import {
  fetchSystemForm,
  PROPOSAL_SYS_FORM_CD,
} from "@/entities/response/api/system-form";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { ApiError } from "@/shared/api/client";
import { RESPONSE_ERROR } from "@/entities/response";
import { loadProposalErrorMessage } from "./proposal-error";

/*
 * 기획안 제출 현황 화면의 SSR 로더 (#171).
 *
 * ── 왜 훅이 아니라 로더인가 ──────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · www·#128과 같은 규약) — 쿠키의 Supabase
 * 세션을 서버에서 읽어 토큰을 브라우저 코드에 싣지 않고, 읽기 전용 조회에 데이터 페칭 상태
 * 기계를 들이지 않는다.
 *
 * ── 무엇을 모으는가 ────────────────────────────────────────
 * 1. 기획안 폼(`sys_form_cd = 'PROPOSAL'`) — `formId`를 여기서 얻는다(주소에 번호를 적지
 *    않는 이유는 `entities/response/api/system-form.ts`에 있다).
 * 2. 그 폼에 낸 내 응답 목록 — 상태·회차·일시. 응답 내용은 상세에서 따로 부른다.
 *
 * 폼 조회가 404 `FORM_NOT_FOUND`면 아직 시드되지 않은 것이라 "폼이 준비되지 않았다"로 갈라
 * 안내한다(다시 시도 버튼을 주지 않는다 — 운영진이 세워야 한다).
 */

export type MyApplicationsLoad =
  | {
      outcome: "ready";
      formId: number;
      formTtlNm: string;
      /** 새 기획안을 지금 낼 수 있는가 — 작성하기 버튼 노출 판단 */
      acceptingYn: boolean;
      /** 서버가 준 순번 오름차순 그대로 */
      responses: MyFormResponse[];
    }
  /** 기획안 폼이 아직 세워지지 않았다 */
  | { outcome: "not-seeded" }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(네트워크·설정 등) */
  | { outcome: "error"; message: string };

export async function loadMyApplications(): Promise<MyApplicationsLoad> {
  try {
    const form = await fetchSystemForm(PROPOSAL_SYS_FORM_CD);
    const responses = await fetchMyFormResponses(form.formId);
    return {
      outcome: "ready",
      formId: form.formId,
      formTtlNm: form.formTtlNm,
      acceptingYn: form.acceptingYn,
      responses,
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
