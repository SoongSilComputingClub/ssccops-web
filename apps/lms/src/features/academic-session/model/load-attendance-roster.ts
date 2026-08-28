import {
  fetchAcademicProgramMembers,
  type AcademicProgramMember,
} from "@/entities/academic-program";
import type { RosterSessionColumn } from "@/entities/academic-session";
// 서버 전용 조회는 배럴이 재export 하지 않는다(클라이언트 번들 오염 방지) — 직접 임포트한다
import { fetchAcademicSessions } from "@/entities/academic-session/api/sessions-read";
import { fetchSessionAttendances } from "@/entities/academic-session/api/attendances";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { loadAttendanceRosterErrorMessage } from "./attendance-roster-error";

/*
 * 출석부 화면의 SSR 로더 (#172 · ssccops-server#135·#137).
 *
 * ── 왜 SSR 셸인가 ──────────────────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · #128·#131과 같은 규약). "누가 팀원인가·
 * 회차가 몇 개인가·각 회차 출석은 어땠나"는 서버에서 모아 결과만 넘긴다. 칸을 눌러 출석을
 * 정정하는 **상호작용 부분만 클라이언트**이고(`use-attendance-roster`), 로더 결과가 `ready`가
 * 되기 전에는 그 컴포넌트를 마운트하지 않는다 — `useState` 초깃값이 곧 폼 초깃값이라 동기화용
 * `useEffect`가 필요 없다(AGENTS.md).
 *
 * ── 무엇을 모으는가 ────────────────────────────────────────────
 * 1. 팀원 목록(#131) — 표의 **행**. 확정 팀원만(출석 대상은 `event_ptcp` CONFIRMED뿐 · 서버 #135).
 * 2. 회차 목록(#135) — 표의 **열**. 실적이 있는 `sesn` 행만(미제출 커리큘럼 항목은 오지 않는다).
 * 3. 회차마다 출석부(#137) — 표의 **칸**. 출석 행렬 API가 없어 회차 수만큼 조회가 나간다.
 *
 * ── 요청 수 (이슈가 "판단해 남기라"고 한 것) ──────────────────────
 * 출석 행렬 전용 엔드포인트가 없어 `1(회차 목록) + 1(팀원) + N(회차별 출석부)`회 조회한다.
 * N은 한 학기치 회차 수(대개 10~20)이고 `Promise.all`로 병렬이라 SSR 한 번의 지연으로 흡수된다.
 * 활동당 회차가 수십을 넘겨 이 비용이 문제가 되면 **서버에 행렬 조회(활동 하나의 회차×팀원
 * 출석을 한 번에)를 요청**한다 — 그 전까지는 이 조립으로 충분하다(#130의 활동 횡단 집계와
 * 달리 이 화면은 활동 하나만 본다).
 *
 * ── 결과를 판별 유니온으로 돌려준다 ────────────────────────────
 * 페이지는 `outcome`으로 분기해 표·로그인 게이트·가입 안내·오류 블록 중 하나를 그린다.
 * 401·미가입을 오류 문구로 뭉개지 않는 것은 apps/www 규약이다(리다이렉트 대신 화면 안 안내).
 */

export type AttendanceRosterLoad =
  | {
      outcome: "ready";
      /** 표의 행 — 확정 팀원 전원 */
      members: AcademicProgramMember[];
      /** 표의 열 — 실적이 있는 회차 전부(진행일 오름차순) */
      columns: RosterSessionColumn[];
    }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(없는 활동·네트워크 등) — 페이지가 문구를 그린다 */
  | { outcome: "error"; message: string };

export async function loadAttendanceRoster(
  academicProgramId: number,
): Promise<AttendanceRosterLoad> {
  try {
    // 회차 목록과 팀원은 서로 독립이라 함께 부른다
    const [sessions, members] = await Promise.all([
      fetchAcademicSessions(academicProgramId),
      // 확정 팀원만 출석 대상이다(서버 #135 설계 결정 #3) — 필터로 좁혀 받는다
      fetchAcademicProgramMembers(academicProgramId, { ptcpSttsCd: "CONFIRMED" }),
    ]);

    // 회차마다 출석부 — 행렬 API가 없어 회차 수만큼 병렬 조회한다
    const attendanceLists = await Promise.all(
      sessions.map((session) =>
        fetchSessionAttendances(academicProgramId, session.sessionId),
      ),
    );

    const columns: RosterSessionColumn[] = sessions.map((session, index) => ({
      session,
      attendances: attendanceLists[index] ?? [],
    }));

    return { outcome: "ready", members, columns };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: loadAttendanceRosterErrorMessage(error) };
  }
}
