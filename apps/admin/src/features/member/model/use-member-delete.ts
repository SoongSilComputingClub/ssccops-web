"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteMember,
  fetchMemberDeletionPreview,
  type MemberDeletionPreview,
} from "@/entities/member";
import { syncSessionOnForbidden } from "@/entities/session";
import { toMemberDeleteErrorMessage } from "./member-error";

/*
 * 회원 하드 삭제 훅 (임시 · ADR-0021 · ssccops-web#411 · 서버 #361).
 *
 * 왜 임시인지는 member-delete-copy.ts 머리 주석에 있다. 여기는 흐름만 — **미리보기 → 시트 →
 * 삭제** 세 단계이고, 화면은 이 훅이 돌려주는 `preview`가 null이 아닐 때 시트를 연다.
 *
 * ── 버튼이 곧바로 시트를 열지 않는다 ────────────────────────────
 * 먼저 `GET /deletion-preview`를 받아 시트에 **지워질 것(건수)과 못 지우는 이유(`blockedBy`)**를
 * 함께 띄운다. 빈 시트를 먼저 열고 안에서 불러오면 "지우기" 버튼이 잠깐이라도 숫자 없이
 * 보이는 순간이 생기고, 그 순간에 누른 사람은 무엇이 딸려 가는지 모른 채 지운다. 미리보기가
 * 실패하면 시트는 열리지 않고 사유가 구역(`previewErrorMessage`)에 남는다 — 기능이 꺼진
 * 배포(404 FEATURE_DISABLED)가 여기서 걸린다.
 *
 * ── 삭제 거절은 시트 안에 남는다 ────────────────────────────────
 * `deleteErrorMessage`는 시트가 닫히기 전까지 그 자리에 있다(행사 삭제 시트와 같은 판단).
 * 409 `MEMBER_REFERENCED`는 미리보기와 삭제 사이에 참조가 생긴 것이라 토스트로 날리면 "왜
 * 안 되지"를 다시 볼 수 없다.
 *
 * ── 성공을 여기서 마무리하지 않는다 ─────────────────────────────
 * 지운 뒤 갈 곳(회원 목록)과 토스트는 화면이 정한다 — 상세 화면은 방금 지운 회원의 주소에
 * 서 있으므로 새로고침하면 404가 되고, 그 이동은 라우터를 가진 쪽의 일이다.
 */

export interface MemberDelete {
  /** 미리보기 응답 — null이면 시트가 닫혀 있다 */
  preview: MemberDeletionPreview | null;
  /** 미리보기를 받는 중 — 구역의 버튼을 잠근다 */
  previewing: boolean;
  /** 삭제 요청이 나가 있다 — 시트의 버튼을 잠근다 */
  deleting: boolean;
  /** 미리보기가 실패한 사유. 시트가 열리기 전이라 구역에 그린다. 비어 있으면 정상 */
  previewErrorMessage: string;
  /** 삭제가 거절된 사유. 시트 안에 남긴다. 비어 있으면 정상 */
  deleteErrorMessage: string;
  /** 미리보기를 받아 시트를 연다 */
  begin: () => Promise<void>;
  /** 시트를 닫고 사유를 비운다 */
  close: () => void;
  /** 지운다. 성공하면 true — 화면이 목록으로 보낸다. 실패하면 false(사유는 `deleteErrorMessage`) */
  confirm: () => Promise<boolean>;
}

export function useMemberDelete(memberId: number): MemberDelete {
  const [preview, setPreview] = useState<MemberDeletionPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewErrorMessage, setPreviewErrorMessage] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // 같은 틱에 두 번 눌린 요청은 그 사이에 렌더가 없어 state 잠금이 아직 걸리지 않는다
  const busyRef = useRef(false);

  const begin = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPreviewing(true);
    setPreviewErrorMessage("");
    setDeleteErrorMessage("");

    try {
      const next = await fetchMemberDeletionPreview(memberId);
      if (aliveRef.current) setPreview(next);
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      if (aliveRef.current) setPreviewErrorMessage(toMemberDeleteErrorMessage(error));
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setPreviewing(false);
    }
  }, [memberId]);

  const close = useCallback(() => {
    setPreview(null);
    setDeleteErrorMessage("");
  }, []);

  const confirm = useCallback(async () => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setDeleting(true);
    setDeleteErrorMessage("");

    try {
      await deleteMember(memberId);
      return true;
    } catch (error: unknown) {
      syncSessionOnForbidden(error);
      if (aliveRef.current) setDeleteErrorMessage(toMemberDeleteErrorMessage(error));
      return false;
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setDeleting(false);
    }
  }, [memberId]);

  return {
    preview,
    previewing,
    deleting,
    previewErrorMessage,
    deleteErrorMessage,
    begin,
    close,
    confirm,
  };
}
