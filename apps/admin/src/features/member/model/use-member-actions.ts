"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bulkChangeMemberGrade,
  bulkChangeMemberStatus,
  changeMemberGrade,
  changeMemberStatus,
  type MemberBulkChangeResult,
  type MemberBulkGradeChangeInput,
  type MemberBulkStatusChangeInput,
  type MemberChangeResult,
  type MemberGradeChangeInput,
  type MemberStatusChangeInput,
} from "@/entities/member";
import { syncSessionOnForbidden } from "@/entities/session";
import { toMemberChangeErrorMessage } from "./member-error";

/*
 * 회원 등급·상태 변경 (#48 · 서버 #78).
 *
 * ── 목 스토어 조작을 서버 호출로 바꾼 자리다 ────────────────────
 * 예전에는 등급·상태를 목 회원 스토어(#54에서 제거)의 회원 행에 쓰고 이력까지 화면이 지어냈다.
 * 토스트는 떴지만 새로고침하면 되돌아갔고, 무엇보다 그 목 회원은 상세 화면이 보여 주는 서버 회원과 다른
 * 사람이었다. 이제 두 조작은 서버의 전용 엔드포인트로 가고 이력은 서버가 한 트랜잭션에서 남긴다.
 *
 * ── 변경자를 싣지 않는다 ────────────────────────────────────────
 * 세션의 `mbrId`를 `chnrgMbrId`로 넣던 코드가 사라졌다. 변경자는 서버가 토큰에서 가져가며,
 * 화면이 정하면 이력이 증거가 되지 못한다(요청 타입에 자리 자체가 없다 · entities/member/api).
 *
 * ── 성공을 토스트로 끝내지 않는다 ───────────────────────────────
 * 이 훅은 결과(`MemberChangeResult`)를 그대로 돌려준다. 호출한 화면이 응답의 `member`로 뱃지와
 * 최근 변경이력을 갈아 끼우고, `warnings`(탈퇴·제명 뒤 남은 역할·하위 업무)를 눈에 남는 형태로
 * 그린다 — 사라지는 토스트로 알리면 아무도 처리하지 않은 채 지나간다.
 *
 * ── 역할 부여·종료는 여기 없다 (#50) ────────────────────────────
 * 목 스토어를 고치던 `assignRole`·`endRole`이 사라졌다. 서버로 옮긴 자리가
 * `use-member-roles.ts`이고 훅을 나눈 것은 **요구 권한이 다르기 때문**이다 — 등급·상태는
 * `MEMBER_MANAGE`, 역할 부여·종료는 `ROLE_MANAGE`다. 한 훅에 두면 화면이 어느 권한으로
 * 잠가야 하는지가 호출부마다 흐려진다.
 *
 * ── 일괄 변경은 반대로 여기 있다 (#382 · 서버 #338) ─────────────
 * 훅을 나누는 기준이 권한이었고, 일괄 변경은 한 명짜리와 **같은 `MEMBER_MANAGE`**다. 거절
 * 사유의 어휘도 같다 — 서버가 일괄 요청의 400(대상 초과·기준 코드 밖)에 한 명짜리와 같은
 * 코드를 내리므로 `toMemberChangeErrorMessage`를 그대로 쓴다. 다른 것은 응답 모양뿐이라
 * `run`이 결과 타입만 제네릭으로 받는다. 한 요청이 나가 있는 동안 다른 요청을 막는
 * `busyRef`도 넷이 공유한다 — 같은 화면에서 한 명짜리와 일괄이 동시에 나갈 일은 없고,
 * 있다면 그것이 막아야 할 일이다.
 */

export interface MemberActions {
  /** 등급·상태 변경 요청이 나가 있는가 — 시트는 이 동안 버튼을 잠근다 */
  changing: boolean;
  /** 마지막 변경이 거절된 사유(서버 문장 포함). 비어 있으면 정상 */
  changeErrorMessage: string;
  /** 사용자가 값을 다시 고르면 낡은 사유를 지운다 */
  clearChangeError: () => void;
  /** 성공하면 변경 후 회원 + 경고, 실패하면 null (사유는 `changeErrorMessage`) */
  changeGrade: (
    memberId: number,
    input: MemberGradeChangeInput,
  ) => Promise<MemberChangeResult | null>;
  changeStatus: (
    memberId: number,
    input: MemberStatusChangeInput,
  ) => Promise<MemberChangeResult | null>;
  /**
   * 여러 명을 같은 값으로. 성공하면 회원별 결과, 실패하면 null (사유는 `changeErrorMessage`).
   *
   * **200이 곧 전원 성공이 아니다** — 회원마다 트랜잭션이 따로라 결과의 `rows`를 읽어야
   * 누가 바뀌었는지 안다. null은 요청 자체가 거절된 것(400·403)이며 그때는 한 명도 안 바뀐다.
   */
  bulkChangeGrade: (input: MemberBulkGradeChangeInput) => Promise<MemberBulkChangeResult | null>;
  bulkChangeStatus: (
    input: MemberBulkStatusChangeInput,
  ) => Promise<MemberBulkChangeResult | null>;
}

export function useMemberActions(): MemberActions {
  const [changing, setChanging] = useState(false);
  const [changeErrorMessage, setChangeErrorMessage] = useState("");

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // 같은 틱에 두 번 눌린 저장은 그 사이에 렌더가 없어 changing 이 아직 갱신되지 않는다
  const busyRef = useRef(false);

  /**
   * 두 엔드포인트의 실패 처리가 같아 한 자리에 둔다 — 성공/실패 판정, 권한 회수 감지, 언마운트
   * 뒤 setState 방지가 등급과 상태에서 갈릴 이유가 없다.
   */
  const run = useCallback(
    async <T>(call: () => Promise<T>): Promise<T | null> => {
      if (busyRef.current) return null;

      busyRef.current = true;
      setChanging(true);
      setChangeErrorMessage("");

      try {
        return await call();
      } catch (error: unknown) {
        /* 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다 */
        syncSessionOnForbidden(error);
        if (aliveRef.current) setChangeErrorMessage(toMemberChangeErrorMessage(error));
        return null;
      } finally {
        busyRef.current = false;
        if (aliveRef.current) setChanging(false);
      }
    },
    [],
  );

  const clearChangeError = useCallback(() => setChangeErrorMessage(""), []);

  const changeGrade = useCallback(
    (memberId: number, input: MemberGradeChangeInput) =>
      run(() => changeMemberGrade(memberId, input)),
    [run],
  );

  const changeStatus = useCallback(
    (memberId: number, input: MemberStatusChangeInput) =>
      run(() => changeMemberStatus(memberId, input)),
    [run],
  );

  const bulkChangeGrade = useCallback(
    (input: MemberBulkGradeChangeInput) => run(() => bulkChangeMemberGrade(input)),
    [run],
  );

  const bulkChangeStatus = useCallback(
    (input: MemberBulkStatusChangeInput) => run(() => bulkChangeMemberStatus(input)),
    [run],
  );

  return {
    changing,
    changeErrorMessage,
    clearChangeError,
    changeGrade,
    changeStatus,
    bulkChangeGrade,
    bulkChangeStatus,
  };
}
