"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createWork, type WorkCreateInput } from "@/entities/work";
import { toWorkCreateErrorMessage } from "./work-error";

/*
 * 업무 등록 훅 (OPS-002 · POST /v1/works).
 *
 * 토스트를 여기서 띄우지 않고 결과 문구를 돌려주는 것은 features/form의 mutation 훅들과
 * 같은 규칙이다 — 성공했을 때 화면을 어디로 옮길지(등록 직후 상세로 이동)는 뷰가 정하고,
 * 훅은 "무슨 일이 있었는지"만 말한다.
 *
 * 진행 중 잠금(inFlightRef)이 필요한 이유는 복제와 다르다. 등록은 **연타하면 같은 내용의
 * 업무가 여러 건 만들어진다** — 서버에 중복을 막을 유니크 제약이 없고(제목이 같은 업무는
 * 정상이다), 되돌리는 API도 아직 없다.
 */

export interface WorkCreation {
  /** 성공했을 때 등록된 업무 ID. 실패·중복 클릭이면 null */
  workId: number | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface WorkCreateControl {
  pending: boolean;
  create: (input: WorkCreateInput) => Promise<WorkCreation>;
}

const BUSY: WorkCreation = { workId: null, message: "" };

export function useCreateWork(): WorkCreateControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const create = useCallback(async (input: WorkCreateInput): Promise<WorkCreation> => {
    if (inFlightRef.current) return BUSY;
    inFlightRef.current = true;
    setPending(true);

    try {
      const created = await createWork(input);
      // 상태는 서버가 기획(PLANNING)으로 고정한다 — 등록 화면에 상태 입력란이 없는 이유다
      return { workId: created.workId, message: "업무를 등록했습니다" };
    } catch (error: unknown) {
      return { workId: null, message: toWorkCreateErrorMessage(error) };
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setPending(false);
    }
  }, []);

  return { pending, create };
}
