import {
  fetchAcademicProgramMembers,
  programStopOf,
  type AcdmActvSttsCd,
  type ProgramStop,
} from "@/entities/academic-program";
import {
  allowsRecording,
  type AcademicSessionDetail,
  type CurriculumItemWithSession,
} from "@/entities/academic-session";
// 서버 전용 조회는 배럴이 재export 하지 않는다(클라이언트 번들 오염 방지) — 직접 임포트한다
import {
  fetchAcademicSession,
  fetchCurriculumItems,
} from "@/entities/academic-session/api/sessions-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { attendanceTargetsOf, type AttendanceTarget } from "./attendance-targets";
import { loadSessionRecordErrorMessage } from "./session-record-error";

/*
 * 회차 기록 작성 화면의 SSR 로더 (#128).
 *
 * ── 왜 훅이 아니라 로더인가 ──────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · www·#131과 같은 규약) — 쿠키의 Supabase
 * 세션을 서버에서 읽어 토큰을 브라우저 코드에 싣지 않고, 읽기 전용 조회에 데이터 페칭 상태
 * 기계를 들이지 않는다. **폼 자체(작성·제출)는 클라이언트**지만, "이 회차를 지금 쓸 수 있는가·
 * 팀원은 누구인가"는 서버에서 판정해 결과만 넘긴다(이슈 · AGENTS.md).
 *
 * ── 무엇을 모으는가 ────────────────────────────────────────
 * 1. 커리큘럼 조회(#134)에서 대상 항목 하나 — 계획(제목·계획일·순번)과 회차 상태·`isEditable`.
 * 2. 팀원 목록(#131) — **참가 상태 필터 없이** 받는다(#748). 출석 대상은 확정 팀원이지만, 재제출이면
 *    그 회차에 기록된 뒤 제외·대기된 사람도 대상이라(서버 #617) 그 사람의 지금 상태를 같은 조회로
 *    안다. 확정으로 좁혀 받던 동안 그 사람이 재제출에서 빠졌다.
 * 3. (재제출일 때만) 회차 상세(#135) — 진행 내용·전달사항·출석·수정요청 사유의 폼 초깃값.
 *
 * 출석 체크리스트에 그릴 줄과 처음 체크 값은 `attendanceTargetsOf`가 2·3으로 만든다.
 *
 * ── 폼을 언제 여는가 ────────────────────────────────────────
 * 서버 판정 `isEditable`(스터디장 본인 × 작성 가능 상태 × 프로그램이 종료·폐지가 아님)이 유일한
 * 기준이다 — `leadrMbrId`를 웹에서 다시 계산하지 않는다. `isEditable`이 false면 사유만 가른다:
 * 프로그램이 종료·폐지면 "종료된/폐지된 프로그램"(#716 · ADR-0057 · #741 · ADR-0058), 작성 가능
 * 상태(`NOT_SUBMITTED`·`REVISION_REQUESTED`)인데 false면 "스터디장이 아님", 아니면 "지금 쓸 수
 * 없는 상태"(제출·승인 완료).
 *
 * 종료·폐지를 먼저 보는 것은 그것이 회차 상태와 무관하게 프로그램 전체를 멈추기 때문이다 — 종료된
 * 프로그램의 미제출 회차를 "스터디장이 아님"으로 안내하면 틀린 말이 된다. **프로그램 상태는
 * 사유를 고르는 데만 쓴다** — 종료인데 `isEditable`이 true면(서버가 아직 종료를 반영하지 않은
 * 배포) 폼을 연다. 판정이 두 벌이 되지 않게 하는 쪽을 택했다(#716 «택하지 않은 길»).
 */

export type SessionRecordLoad =
  | {
      outcome: "ready";
      /** 신규 제출이면 "create", 재제출이면 "resubmit" */
      mode: "create" | "resubmit";
      curriculumItem: CurriculumItemWithSession;
      /** 출석 체크리스트에 그릴 줄 — 확정 팀원, 재제출이면 그 회차에 기록된 사람까지 (#748) */
      targets: AttendanceTarget[];
      /** 재제출일 때만 채워진다 — 폼 초깃값과 "학술국장이 요청한 수정 사항" */
      session: AcademicSessionDetail | null;
    }
  /** 프로그램이 종료·폐지돼 기록할 수 없다 — 재시작·복원은 학술국장이 한다 (ADR-0057 · ADR-0058) */
  | { outcome: "program-stopped"; stop: ProgramStop }
  /** 스터디장 본인이 아니라 이 회차를 기록할 수 없다 */
  | { outcome: "not-leader" }
  /** 이미 제출됐거나(SUBMITTED) 승인 완료(APPROVED)라 작성 화면을 열지 않는다 */
  | { outcome: "not-recordable"; sesnSttsLabel: string }
  /** 미로그인·토큰 만료 — 페이지가 `LoginGate`를 그린다 */
  | { outcome: "unauthenticated" }
  /** 로그인은 됐지만 미가입 — 페이지가 어드민 `/signup` 안내를 그린다 */
  | { outcome: "signup-required" }
  /** 그 밖의 실패(없는 활동·없는 커리큘럼 항목·네트워크 등) */
  | { outcome: "error"; message: string };

export async function loadSessionRecord(
  academicProgramId: number,
  curriculumItemId: number,
  /** 셸이 고른 프로그램의 상태(`mine=leader` 목록) — 폼을 못 여는 사유를 고르는 데만 쓴다 */
  programSttsCd: AcdmActvSttsCd,
): Promise<SessionRecordLoad> {
  try {
    // 커리큘럼과 팀원은 서로 독립이라 함께 부른다
    const [curriculumItems, members] = await Promise.all([
      fetchCurriculumItems(academicProgramId),
      // 필터 없이 받는다 — 재제출의 «기록에만 남은 사람»도 출석 대상이다(#748 · 서버 #617)
      fetchAcademicProgramMembers(academicProgramId),
    ]);

    const curriculumItem = curriculumItems.find(
      (item) => item.curriculumItemId === curriculumItemId,
    );
    if (!curriculumItem) {
      return {
        outcome: "error",
        message:
          "이 프로그램에 없는 회차입니다 — 학술 대시보드에서 다시 골라주세요",
      };
    }

    if (!curriculumItem.isEditable) {
      const stop = programStopOf(programSttsCd);
      if (stop) {
        return { outcome: "program-stopped", stop };
      }
      if (allowsRecording(curriculumItem.sesnSttsCd)) {
        return { outcome: "not-leader" };
      }
      return {
        outcome: "not-recordable",
        sesnSttsLabel:
          curriculumItem.sesnSttsCd === "APPROVED" ? "이미 승인된" : "학술국장 검토 중인",
      };
    }

    const mode: "create" | "resubmit" =
      curriculumItem.sessionId === null ? "create" : "resubmit";

    const session =
      mode === "resubmit" && curriculumItem.sessionId !== null
        ? await fetchAcademicSession(academicProgramId, curriculumItem.sessionId)
        : null;

    return {
      outcome: "ready",
      mode,
      curriculumItem,
      targets: attendanceTargetsOf(members, session),
      session,
    };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: loadSessionRecordErrorMessage(error) };
  }
}
