"use client";

import { useEffect, useState } from "react";
import {
  fetchMemberGrades,
  fetchMemberStatuses,
  type MemberGradeOption,
  type MemberStatusOption,
} from "@/entities/member";

/*
 * 회원 등급·상태 기준 코드 조회 훅 (서버 #76 · GET /v1/member-grades · /v1/member-statuses).
 *
 * 목록 화면의 필터 칩이 이 목록으로 그려진다. `shared/config/codes.ts`의 `MBR_GRD_NM`을
 * 돌리지 않는 것은 등급·상태가 기준정보 테이블(mbr_grd·mbr_stts)이라 운영 중에 이름이 바뀔
 * 수 있기 때문이다 — 표시 명칭과 순서의 근거는 서버 한 곳이다.
 *
 * ── 실패를 화면 오류로 키우지 않는다 ────────────────────────────
 * 이 조회가 실패해도 목록 자체는 나온다. 칩이 없으면 필터를 못 걸 뿐이라, 명부를 통째로
 * 오류 화면으로 덮는 대신 빈 배열로 둔다 — 사용자가 보러 온 것은 회원 목록이지 칩이 아니다.
 * (두 목록은 인증만 요구하므로 권한 부족으로 여기만 실패할 일도 없다.)
 *
 * 두 호출을 한 훅에 둔 것은 언제나 함께 쓰이고 언제나 함께 도착해야 하기 때문이다 — 따로
 * 두면 등급 칩만 먼저 그려졌다가 상태 칩이 뒤늦게 끼어들며 줄이 밀린다.
 */

export interface MemberCodes {
  grades: MemberGradeOption[];
  statuses: MemberStatusOption[];
  /** 두 목록이 아직 오지 않았다 — 화면은 칩 자리를 비워 둔다 */
  loading: boolean;
}

export function useMemberCodes(): MemberCodes {
  const [codes, setCodes] = useState<Omit<MemberCodes, "loading"> | null>(null);

  useEffect(() => {
    let alive = true;

    Promise.all([fetchMemberGrades(), fetchMemberStatuses()])
      .then(([grades, statuses]) => {
        if (alive) setCodes({ grades, statuses });
      })
      .catch(() => {
        if (alive) setCodes({ grades: [], statuses: [] });
      });

    return () => {
      alive = false;
    };
  }, []);

  return {
    grades: codes?.grades ?? [],
    statuses: codes?.statuses ?? [],
    loading: codes === null,
  };
}
