"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import { deleteSubWork } from "@/entities/sub-work";
import { toSubWorkDeleteErrorMessage } from "./sub-work-error";

/*
 * 하위 업무 삭제 훅 (서버 #125 · DELETE /v1/sub-works/{subWorkId}).
 *
 * 구조는 use-update-sub-work와 같다 — 토스트를 여기서 띄우지 않고 결과 문구를 돌려주며,
 * 성공했을 때 화면을 어디로 옮길지는 뷰가 정한다(상위 업무 상세로 이동).
 */

export interface SubWorkDeletion {
  /** 성공하면 true. 실패·중복 클릭이면 false */
  deleted: boolean;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface SubWorkDeleteControl {
  pending: boolean;
  remove: (subWorkId: number) => Promise<SubWorkDeletion>;
}

const BUSY: SubWorkDeletion = { deleted: false, message: "" };

export function useDeleteSubWork(): SubWorkDeleteControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const remove = useCallback(async (subWorkId: number): Promise<SubWorkDeletion> => {
    if (inFlightRef.current) return BUSY;
    inFlightRef.current = true;
    setPending(true);

    try {
      await deleteSubWork(subWorkId);
      return { deleted: true, message: "하위 업무를 삭제했습니다" };
    } catch (error: unknown) {
      syncSessionOnForbidden(error);
      return { deleted: false, message: toSubWorkDeleteErrorMessage(error) };
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setPending(false);
    }
  }, []);

  return { pending, remove };
}
