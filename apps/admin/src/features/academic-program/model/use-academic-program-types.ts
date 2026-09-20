"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAcademicProgramTypes,
  type AcademicProgramType,
} from "@/entities/academic-program";
import { toAcademicProgramErrorMessage } from "./academic-program-error";

/*
 * 학술 활동 유형 목록 (#568 · GET /v1/academic-program-types · 서버 #130).
 *
 * ── 왜 목록 응답에서 뽑지 않는가 ─────────────────────────────
 * 활동 목록 화면의 유형 필터 칩은 원래 **받아 둔 활동들의 typeCd 집합**에서 뽑았다(#125 —
 * 유형 엔드포인트를 붙이지 않은 채 행사 앱의 분류 칩을 따라한 것이다). 그 방식은 필터를
 * 거는 순간 깨진다: 서버가 이미 걸러 준 목록에는 고른 유형만 있으므로 **나머지 칩이 통째로
 * 사라지고**, 화면에는 «전체 유형»과 방금 고른 것 둘만 남아 다른 유형으로 곧장 옮겨갈 수
 * 없다(«전체 유형»을 한 번 거쳐야 한다). 유형이 셋이 되면서(트랙 · 서버 #510) 더 잘 드러났다.
 *
 * 그래서 칩의 출처를 기준정보로 옮긴다 — 필터 결과와 무관하게 언제나 같은 목록이다.
 *
 * ── 인가 ─────────────────────────────────────────────────────
 * 조회는 **인증만** 필요하다(쓰기만 `ACADEMIC_PROGRAM_MANAGE` · 서버 #9). 활동 목록을 여는
 * 사람은 이미 로그인한 회원이라 이 호출이 새로 막는 것은 없다.
 *
 * ── 실패해도 화면을 세우지 않는다 ─────────────────────────────
 * 유형 칩은 **거들뿐인 보조 필터**이고 활동 목록 자체는 따로 조회한다. 그래서 이 조회가
 * 실패하면 칩 줄만 접고 오류를 띄우지 않는다 — 목록이 멀쩡히 떠 있는데 «유형을 불러오지
 * 못했습니다»를 함께 세우면 사용자가 무엇이 실패했는지 가늠할 수 없다. 대신 **고른 유형이
 * 있으면 그 칩은 남긴다**(아래 `typeOptions`의 합집합) — 주소에 필터가 걸려 있는데 그것을
 * 끌 칩이 사라지면 빠져나올 길이 없어진다.
 *
 * 로딩을 setState 하지 않는 방식(결과에 요청 key를 실어 두고 렌더 중에 계산)은
 * `useActiveSubWorkTypes`와 같다 (react-hooks/set-state-in-effect).
 */

export type AcademicProgramTypesStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedTypes {
  key: number;
  types: AcademicProgramType[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface AcademicProgramTypes {
  /** 서버가 `indctSeqno` 순으로 준 그대로 — 표시 순서를 웹이 다시 정하지 않는다 */
  types: AcademicProgramType[];
  status: AcademicProgramTypesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useAcademicProgramTypes(): AcademicProgramTypes {
  const [loaded, setLoaded] = useState<LoadedTypes | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let alive = true;

    fetchAcademicProgramTypes()
      .then((types) => {
        if (alive) setLoaded({ key: requestKey, types, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            types: [],
            errorMessage: toAcademicProgramErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: AcademicProgramTypesStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    types: current?.types ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
