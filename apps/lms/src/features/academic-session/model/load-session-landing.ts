import { ACADEMIC_SESSION_ERROR } from "@/entities/academic-session";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchAcademicSessionById } from "@/entities/academic-session/api/sessions-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { ApiError } from "@/shared/api/client";
import { loadSessionRecordErrorMessage } from "./session-record-error";

/*
 * 공유 링크로 들어온 회차 하나를 **어디로 보낼지** 정하는 SSR 로더 (#335 · 서버 #316·#319).
 *
 * ── 이 로더가 존재하는 이유 ────────────────────────────────
 * 공유 토큰이 들고 오는 것은 회차 id 하나다. 그런데 이 앱에는 **회차 상세 화면이 없다** —
 * 회차는 활동 상세(`/studio/programs/{id}`)의 "회차 이력" 안에서 보인다. 그래서 사람을 보내려면
 * 회차 id로 활동 id를 먼저 알아내야 하고, 그 값은 `GET /v1/academic-sessions/{sessionId}`의
 * 응답에 실려 온다(#316이 그러라고 연 경로다).
 *
 * ── 왜 www가 아니라 여기서 부르는가 ────────────────────────
 * 그 조회는 **인증 경로**이고, 필요한 인증은 이 앱의 것이다. 착지 화면(`apps/www`의
 * `/s/{token}`)은 설계상 익명이라(크롤러가 OG 카드를 받아야 한다) 거기서 부르면 두 갈래로 다
 * 깨진다 — 서버에서 부르면 크롤러가 401을 받고, 브라우저에서 부르면 **www에 로그인하지 않은
 * 사람**이 401을 받는다. 두 앱은 오리진이 달라 세션이 따로 놀고, lms를 쓰는 부원이 www에는
 * 로그인하지 않은 상태가 오히려 흔하다.
 *
 * 목적지가 어차피 로그인이 필요한 화면이므로 해석을 목적지 앱이 맡는다. 미로그인이면 페이지가
 * `LoginGate`를 그리고, **로그인 뒤 같은 주소가 다시 그려지면 그때 해석이 끝나 넘어간다** —
 * 되돌아올 곳을 따로 기억할 필요가 없는 것이 이 구조의 덤이다.
 *
 * 크롤러는 여기까지 오지 않는다 — 카드는 `/public/v1/share/{token}`이 이미 만들었다.
 */

export type SessionLandingLoad =
  /** 해석 성공 — 페이지가 활동 상세로 넘긴다. 회차 id를 함께 돌려주어 호출부가 다시 좁히지 않는다 */
  | { outcome: "ready"; academicProgramId: number; sessionId: number }
  /** 없는 회차·삭제된 회차 */
  | { outcome: "not-found" }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(네트워크 등) */
  | { outcome: "error"; message: string };

export async function loadSessionLanding(
  sessionId: number | null,
): Promise<SessionLandingLoad> {
  // 숫자가 아닌 주소는 서버를 부르지 않고 끊는다 — 없는 회차와 사용자에게 같은 것이다
  if (sessionId === null) return { outcome: "not-found" };

  try {
    const session = await fetchAcademicSessionById(sessionId);
    return {
      outcome: "ready",
      academicProgramId: session.academicProgramId,
      sessionId: session.sessionId,
    };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    /*
     * 없는 회차는 404 `SESSION_NOT_FOUND`로 온다. 폐기된 공유 링크는 여기까지 오지 않고
     * 착지에서 이미 끊기므로(미리보기가 404), 여기 오는 404는 "회차가 사라졌다"뿐이다.
     */
    if (
      error instanceof ApiError &&
      error.code === ACADEMIC_SESSION_ERROR.SESSION_NOT_FOUND
    ) {
      return { outcome: "not-found" };
    }
    return { outcome: "error", message: loadSessionRecordErrorMessage(error) };
  }
}
