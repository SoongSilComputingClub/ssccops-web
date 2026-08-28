"use client";

import { useCallback, useState } from "react";
import { transitionAcademicProgram } from "@/entities/academic-program";
import { toRecruitmentErrorMessage } from "./recruitment-error";

/*
 * 모집 시작 훅 (#127 · 서버 #133 · POST /v1/academic-programs/{id}/transitions).
 *
 * `START_RECRUITMENT` 은 `APPROVED → ONGOING` 전이다 — 연결된 신청서(폼)를 서버가 같은
 * 트랜잭션에서 OPEN 으로 전이한다(클라이언트가 두 번 부르지 않는다 · 서버 설계 결정 2).
 * `RECRUITING` 상태는 없으므로 모집 중을 별도 배지로 그리지 않는다 — 모집 여부는 연결된 폼의
 * 접수 상태(`formReceiptStatus`)로 읽는다(#127).
 *
 * ── 모집 기간은 오프셋을 붙여 보낸다 ────────────────────────
 * `datetime-local` 입력은 오프셋 없는 값을 주는데 서버는 OffsetDateTime 이라 본문 파싱에서
 * 400 이 난다 — `transitionAcademicProgram` 안에서 `withServiceOffset` 이 붙인다. 여기서는
 * 입력 문자열을 그대로 넘긴다.
 *
 * 성공 뒤 화면 갱신(활동 상세 재조회)은 호출부가 한다 — 이 훅은 전이만 책임진다.
 */

export interface StartRecruitmentInput {
  /** datetime-local 값 ("2026-03-01T00:00"). 비어 있으면 null 로 보낸다 */
  recruitmentStartAt: string | null;
  recruitmentEndAt: string | null;
}

export interface StartRecruitment {
  starting: boolean;
  /** 성공하면 빈 문자열, 실패하면 사용자에게 보여줄 한 줄을 돌려준다 */
  run: (input: StartRecruitmentInput) => Promise<string>;
}

export function useStartRecruitment(academicProgramId: number): StartRecruitment {
  const [starting, setStarting] = useState(false);

  const run = useCallback(
    async (input: StartRecruitmentInput): Promise<string> => {
      if (starting) return "";
      setStarting(true);
      try {
        await transitionAcademicProgram(academicProgramId, {
          transition: "START_RECRUITMENT",
          recruitmentStartAt: input.recruitmentStartAt || null,
          recruitmentEndAt: input.recruitmentEndAt || null,
        });
        return "";
      } catch (error: unknown) {
        return toRecruitmentErrorMessage(error);
      } finally {
        setStarting(false);
      }
    },
    [academicProgramId, starting],
  );

  return { starting, run };
}
