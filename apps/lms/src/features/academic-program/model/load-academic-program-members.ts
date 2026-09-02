import {
  fetchAcademicProgramMembers,
  type AcademicProgramMember,
  type AcademicProgramMemberFilter,
} from "@/entities/academic-program";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toAcademicProgramMembersErrorMessage } from "./members-error";

/*
 * 팀원 목록 로더 (#131 · GET /v1/academic-programs/{id}/members).
 *
 * ── 왜 훅이 아니라 로더인가 ──────────────────────────────────
 * 이슈 체크리스트는 `use-academic-program-members.ts`(클라이언트 훅)를 적었지만, 그것은
 * 어드민 학술 화면의 패턴이고 이 이슈가 apps/lms로 옮겨 오기 전 시안이다. 이 앱은 조회
 * 전용 화면을 **서버 컴포넌트로 그린다**(AGENTS.md — 쿠키의 Supabase 세션을 서버에서 읽어
 * 토큰을 브라우저 코드에 싣지 않고, 데이터 페칭 상태 기계를 들이지 않는다). 팀원 명단은
 * 읽기 전용에 상호작용이 없으므로 클라이언트 훅을 둘 이유가 없다 — 대신 SSR 페이지가 한 번
 * 부르는 이 로더가 조회·오류 분기를 한자리에 모은다.
 *
 * ── 결과를 판별 유니온으로 돌려준다 ──────────────────────────
 * 페이지는 `outcome`으로 분기해 표·로그인 게이트·가입 안내·오류 블록 중 하나를 그린다.
 * 401/미가입을 오류 문구로 뭉개지 않는 것은 apps/www 규약이다 — 그쪽은 리다이렉트가 아니라
 * 화면 안 안내로 처리한다.
 *
 * `@/shared/api/authed-client`를 거쳐 `next/headers`(쿠키)를 타므로 이 모듈은 사실상 서버
 * 전용이다 — 클라이언트 컴포넌트에서 임포트하면 빌드가 깨진다(admin·www가 기대는 것과 같은
 * 보호이고, 그래서 `server-only` 패키지를 따로 들이지 않는다).
 */

export type ProgramMembersLoad =
  | { outcome: "ready"; members: AcademicProgramMember[] }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(없는 활동·네트워크 등) — 페이지가 문구를 그린다 */
  | { outcome: "error"; message: string };

export async function loadAcademicProgramMembers(
  academicProgramId: number,
  filter: AcademicProgramMemberFilter = {},
): Promise<ProgramMembersLoad> {
  try {
    const members = await fetchAcademicProgramMembers(academicProgramId, filter);
    return { outcome: "ready", members };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toAcademicProgramMembersErrorMessage(error) };
  }
}
