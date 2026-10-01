import type { AcademicProgramMember, PtcpSttsCd } from "@/entities/academic-program";
import type { AcademicSessionDetail } from "@/entities/academic-session";

/*
 * 회차 기록 폼의 출석 대상 (#748 · ssccops#556 · 서버 #617).
 *
 * ── 재제출은 지금 명단이 아니라 «그 회차의 기록»에서 시작한다 ──
 * 신규 제출의 대상은 확정 팀원 전원이고 모두 출석으로 시작한다. 재제출은 다르다 — 그 회차를
 * 기록한 뒤에 명단이 바뀌었을 수 있다(#742 — 스터디장이 진행 중 언제든 넣고 뺀다). 그래서
 * 대상은 **지금 확정 팀원 ∪ 이 회차에 기록된 참가자**이고, 서버가 받는 범위와 같다(#617).
 *
 * - 기록에 있고 지금도 확정이면 이전 체크 값으로.
 * - 기록에 없는데 지금 확정이면 **기록 뒤 합류**다 — 결석으로 시작한다. 전원 출석으로 시작하던
 *   동안 손대지 않고 내면 참석하지 않은 회차에 출석으로 올라갔다.
 * - 기록에 있는데 지금 확정이 아니면(제외·대기) **기록에만 남은 사람**이다 — 이전 체크 값으로
 *   보이고 고칠 수 있다. 지금 명단으로만 만들던 동안 이 사람이 요청에서 빠졌고, 서버는 싣지 않은
 *   줄을 지웠다(#617 전). 화면에 보이게 둔 것은 스터디장이 무엇을 내는지 알아야 하기 때문이다.
 *
 * 순수 모듈이다 — SSR 로더가 계산해 결과만 폼에 넘긴다.
 */

export type AttendanceTargetKind =
  /** 지금 확정 팀원 — 신규 제출의 전원, 재제출에서 이 회차에 기록된 사람 */
  | "member"
  /** 재제출 — 지금 확정 팀원인데 이 회차 기록에 없다 */
  | "joined-after"
  /** 재제출 — 이 회차에 기록됐는데 지금 확정 팀원이 아니다 */
  | "recorded-only";

export interface AttendanceTarget {
  /** event_ptcp_id — 출석 배열이 보내는 식별자(회원 PK 아님) */
  eventPtcpId: number;
  /** 회원 이름. 비어 있으면 빈 문자열(표시 규칙은 뷰가 정한다) */
  memberName: string;
  /** 서버 판정 그대로(재계산 금지). 명단에서 찾지 못한 사람은 false */
  isLeader: boolean;
  kind: AttendanceTargetKind;
  /**
   * `recorded-only`일 때 지금 참가 상태(제외·대기). 명단에서 찾지 못하면 null — 상태를
   * 지어내지 않는다. 그 밖의 줄은 null.
   */
  currentSttsCd: PtcpSttsCd | null;
  /** 폼이 처음 보이는 체크 값 */
  initialPresent: boolean;
}

/**
 * 출석 대상을 만든다. `members`는 **참가 상태 필터 없이** 받은 명단(취소 포함 전부)이다 —
 * 기록에만 남은 사람의 지금 상태를 같은 조회로 알기 위해서다.
 *
 * 순서는 지금 확정 팀원(명단 순서)이 먼저, 기록에만 남은 사람(기록 순서)이 뒤다.
 */
export function attendanceTargetsOf(
  members: AcademicProgramMember[],
  session: AcademicSessionDetail | null,
): AttendanceTarget[] {
  const confirmed = members.filter((member) => member.ptcpSttsCd === "CONFIRMED");

  if (session === null) {
    return confirmed.map((member) => ({
      eventPtcpId: member.eventPtcpId,
      memberName: member.memberName,
      isLeader: member.isLeader,
      kind: "member",
      currentSttsCd: null,
      initialPresent: true,
    }));
  }

  const recorded = new Map(session.attendances.map((row) => [row.eventPtcpId, row]));
  const memberById = new Map(members.map((member) => [member.eventPtcpId, member]));

  const current: AttendanceTarget[] = confirmed.map((member) => {
    const row = recorded.get(member.eventPtcpId);
    return {
      eventPtcpId: member.eventPtcpId,
      memberName: member.memberName,
      isLeader: member.isLeader,
      kind: row ? "member" : "joined-after",
      currentSttsCd: null,
      initialPresent: row?.atndYn ?? false,
    };
  });

  const confirmedIds = new Set(confirmed.map((member) => member.eventPtcpId));
  const recordedOnly: AttendanceTarget[] = session.attendances
    .filter((row) => !confirmedIds.has(row.eventPtcpId))
    .map((row) => {
      const member = memberById.get(row.eventPtcpId);
      return {
        eventPtcpId: row.eventPtcpId,
        memberName: row.memberName,
        isLeader: member?.isLeader ?? false,
        kind: "recorded-only",
        currentSttsCd: member?.ptcpSttsCd ?? null,
        initialPresent: row.atndYn,
      };
    });

  return [...current, ...recordedOnly];
}
