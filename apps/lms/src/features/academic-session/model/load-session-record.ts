import {
  fetchAcademicProgramMembers,
  type AcademicProgramMember,
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
 * 2. 팀원 목록(#131) — 출석 체크리스트(확정 팀원 전원).
 * 3. (재제출일 때만) 회차 상세(#135) — 진행 내용·전달사항·출석·수정요청 사유의 폼 초깃값.
 *
 * ── 폼을 언제 여는가 ────────────────────────────────────────
 * 서버 판정 `isEditable`(스터디장 본인 × 작성 가능 상태)이 유일한 기준이다 — `leadrMbrId`를
 * 웹에서 다시 계산하지 않는다. `isEditable`이 false면 상태로 사유를 가른다: 작성 가능 상태
 * (`NOT_SUBMITTED`·`REVISION_REQUESTED`)인데 false면 "스터디장이 아님", 아니면 "지금 쓸 수 없는
 * 상태"(제출·승인 완료).
 */

export type SessionRecordLoad =
  | {
      outcome: "ready";
      /** 신규 제출이면 "create", 재제출이면 "resubmit" */
      mode: "create" | "resubmit";
      curriculumItem: CurriculumItemWithSession;
      /** 출석 체크리스트에 그릴 확정 팀원 전원 */
      members: AcademicProgramMember[];
      /** 재제출일 때만 채워진다 — 폼 초깃값과 "국장이 요청한 수정 사항" */
      session: AcademicSessionDetail | null;
    }
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
): Promise<SessionRecordLoad> {
  try {
    // 커리큘럼과 팀원은 서로 독립이라 함께 부른다
    const [curriculumItems, members] = await Promise.all([
      fetchCurriculumItems(academicProgramId),
      // 확정 팀원만 출석 대상이다(서버 설계 결정 #3) — 필터로 좁혀 받는다
      fetchAcademicProgramMembers(academicProgramId, { ptcpSttsCd: "CONFIRMED" }),
    ]);

    const curriculumItem = curriculumItems.find(
      (item) => item.curriculumItemId === curriculumItemId,
    );
    if (!curriculumItem) {
      return {
        outcome: "error",
        message:
          "이 활동에서 해당 커리큘럼 항목을 찾을 수 없습니다 — 학술 대시보드에서 회차를 다시 골라주세요",
      };
    }

    if (!curriculumItem.isEditable) {
      if (allowsRecording(curriculumItem.sesnSttsCd)) {
        return { outcome: "not-leader" };
      }
      return {
        outcome: "not-recordable",
        sesnSttsLabel:
          curriculumItem.sesnSttsCd === "APPROVED" ? "이미 승인된" : "국장 검토 중인",
      };
    }

    const mode: "create" | "resubmit" =
      curriculumItem.sessionId === null ? "create" : "resubmit";

    const session =
      mode === "resubmit" && curriculumItem.sessionId !== null
        ? await fetchAcademicSession(academicProgramId, curriculumItem.sessionId)
        : null;

    return { outcome: "ready", mode, curriculumItem, members, session };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: loadSessionRecordErrorMessage(error) };
  }
}
