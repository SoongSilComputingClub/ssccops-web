"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import { deleteWork } from "@/entities/work";
import { toWorkDeleteErrorMessage } from "./work-error";

/*
 * 업무 삭제 훅 (서버 #125 · DELETE /v1/works/{workId}).
 *
 * 구조는 use-update-work와 같다 — 토스트를 여기서 띄우지 않고 결과 문구를 돌려주며, 성공
 * 했을 때 화면을 어디로 옮길지는 뷰가 정한다(업무 목록으로 이동). 서버가 하위 업무까지
 * 계단식으로 함께 지우므로 이 훅은 work 한 번만 호출한다.
 */

export interface WorkDeletion {
  /** 성공하면 true. 실패·중복 클릭이면 false */
  deleted: boolean;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface WorkDeleteControl {
  pending: boolean;
  remove: (workId: number) => Promise<WorkDeletion>;
}

const BUSY: WorkDeletion = { deleted: false, message: "" };

export function useDeleteWork(): WorkDeleteControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const remove = useCallback(async (workId: number): Promise<WorkDeletion> => {
    if (inFlightRef.current) return BUSY;
    inFlightRef.current = true;
    setPending(true);

    try {
      await deleteWork(workId);
      return { deleted: true, message: "업무를 삭제했습니다" };
    } catch (error: unknown) {
      syncSessionOnForbidden(error);
      return { deleted: false, message: toWorkDeleteErrorMessage(error) };
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setPending(false);
    }
  }, []);

  return { pending, remove };
}
