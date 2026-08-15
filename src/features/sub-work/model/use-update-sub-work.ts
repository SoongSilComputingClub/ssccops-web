"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import {
  updateSubWork,
  type SubWorkDetail,
  type SubWorkUpdateInput,
} from "@/entities/sub-work";
import { toSubWorkCreateErrorMessage } from "./sub-work-error";

/*
 * 하위 업무 수정 훅 (OPS-030 · PATCH /v1/sub-works/{subWorkId}).
 *
 * 구조는 use-create-sub-work와 같다 — 토스트를 여기서 띄우지 않고 결과 문구를 돌려주며,
 * 성공했을 때 화면을 어디로 옮길지는 뷰가 정한다. 오류 문구도 등록 훅의 것을 재사용한다 —
 * 담당자 부적격·기간 역전·권한 부족은 등록과 수정이 같은 코드로 온다.
 *
 * 진행 중 잠금(inFlightRef)은 연타로 같은 요청이 겹쳐 나가는 것을 막는다.
 */

export interface SubWorkUpdate {
  /** 성공했을 때 갱신된 하위 업무 상세. 실패·중복 클릭이면 null */
  subWork: SubWorkDetail | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface SubWorkUpdateControl {
  pending: boolean;
  update: (subWorkId: number, input: SubWorkUpdateInput) => Promise<SubWorkUpdate>;
}

const BUSY: SubWorkUpdate = { subWork: null, message: "" };

export function useUpdateSubWork(): SubWorkUpdateControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const update = useCallback(
    async (subWorkId: number, input: SubWorkUpdateInput): Promise<SubWorkUpdate> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const subWork = await updateSubWork(subWorkId, input);
        return { subWork, message: "하위 업무 정보를 수정했습니다" };
      } catch (error: unknown) {
        syncSessionOnForbidden(error);
        return { subWork: null, message: toSubWorkCreateErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, update };
}
