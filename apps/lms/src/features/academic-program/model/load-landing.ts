// 서버 전용 조회는 배럴이 재export 하지 않는다(클라이언트 번들 오염 방지) — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";

/*
 * 첫 화면(`/`)의 SSR 로더 (#228).
 *
 * ── 왜 불리언 하나로 안 되는가 ──────────────────────────────
 * 상단 바 판정(`fetchIsAcademicLeader` · #224)은 실패를 전부 `false`로 삼킨다 — 헤더 하나
 * 때문에 전 화면이 죽지 않게 하려는 것이고 거기서는 그게 맞다. 하지만 랜딩은 **그 사람이
 * 지금 무엇을 할 수 있는지**를 그리는 화면이라, 미로그인·미가입·스터디장을 갈라야 한다.
 * 미가입자에게 카드 두 장을 내밀면 어느 쪽을 눌러도 막힌다(기획안 제출도 회원이어야 한다) —
 * 가입 안내가 먼저다.
 *
 * ── 조회는 하나다 ──────────────────────────────────────────
 * `?mine=leader` 목록 한 번으로 세 가지가 다 나온다: 던진 오류가 401이면 미로그인,
 * `SIGNUP_REQUIRED`면 미가입, 성공했으면 목록이 비었는지로 스터디장 여부. 대시보드 로더
 * (`load-leader-dashboard`)와 같은 조회를 쓰므로 스터디장이 `/studio`로 넘어가도 캐시가
 * 겹친다.
 *
 * ── 목록 길이로 판정한다 — 서버가 걸러 준다 (#241) ─────────────
 * `mine=leader`는 스터디장/팀장 본인인 활동만 준다(ssccops-server#215). 기획안만 낸 회원의
 * 행은 애초에 오지 않으므로 목록이 비었으면 그대로 일반 회원이다. #224 시절 `mine=true`는
 * 스터디장 OR 제출자를 함께 줘서 `isLeader`로 한 번 더 걸러야 했다 — 그 판정을 서버가
 * 필터로 답하게 옮긴 것이다(판정을 웹에서 다시 계산하지 않는다).
 */
export type LandingLoad =
  /** 스터디장 — 페이지가 `/studio`로 넘긴다 */
  | { outcome: "leader" }
  /** 가입까지 마친 일반 회원 — 카드 두 장 */
  | { outcome: "member" }
  /** 미로그인·토큰 만료 — 로그인 게이트 */
  | { outcome: "unauthenticated" }
  /** 로그인은 했지만 미가입 — 어드민 가입 안내 */
  | { outcome: "signup-required" };

export async function loadLanding(): Promise<LandingLoad> {
  try {
    const programs = await fetchMyAcademicPrograms();
    return programs.length > 0 ? { outcome: "leader" } : { outcome: "member" };
  } catch (error) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    /*
     * 그 밖의 실패(네트워크·서버 오류)는 일반 회원 랜딩으로 떨어뜨린다. 첫 화면이 오류
     * 문구로 끝나면 갈 곳이 없지만, 카드 두 장은 눌러서 각 화면이 자기 오류를 그리게 한다 —
     * 조회가 죽어도 동선은 남는다.
     */
    return { outcome: "member" };
  }
}
