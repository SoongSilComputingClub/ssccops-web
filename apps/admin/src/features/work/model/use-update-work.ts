"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import { updateWork, type WorkCreateInput, type WorkDetail } from "@/entities/work";
import { toWorkCreateErrorMessage } from "./work-error";

/*
 * 업무 수정 훅 (OPS-004 · PATCH /v1/works/{workId}).
 *
 * 구조는 use-create-work와 같다 — 토스트를 여기서 띄우지 않고 결과 문구를 돌려주며,
 * 성공했을 때 화면을 어디로 옮길지는 뷰가 정한다. 오류 문구도 등록 훅의 것을 그대로
 * 재사용한다 — 담당자 부적격·기간 역전·권한 부족은 등록과 수정이 같은 코드로 온다
 * (서버 OPS-004가 OPS-002와 같은 필드 구성이라 오류 표면도 같다).
 *
 * 진행 중 잠금(inFlightRef)은 연타로 같은 요청이 겹쳐 나가는 것을 막는다 — 수정은 멱등하지만
 * (같은 값으로 두 번 보내도 결과가 같다) 응답이 뒤섞여 화면에 반영되는 순서가 요청 순서와
 * 달라질 수 있다.
 */

export interface WorkUpdate {
  /** 성공했을 때 갱신된 업무 상세. 실패·중복 클릭이면 null */
  work: WorkDetail | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface WorkUpdateControl {
  pending: boolean;
  update: (workId: number, input: WorkCreateInput) => Promise<WorkUpdate>;
}

const BUSY: WorkUpdate = { work: null, message: "" };

export function useUpdateWork(): WorkUpdateControl {
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
    async (workId: number, input: WorkCreateInput): Promise<WorkUpdate> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const work = await updateWork(workId, input);
        return { work, message: "업무 정보를 수정했습니다" };
      } catch (error: unknown) {
        syncSessionOnForbidden(error);
        return { work: null, message: toWorkCreateErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, update };
}
