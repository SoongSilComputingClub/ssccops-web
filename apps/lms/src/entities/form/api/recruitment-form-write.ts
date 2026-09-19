"use client";

import type { QitemCpstCn } from "@ssccops/form-renderer";
import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import type { RecruitmentFormView } from "../model/types";
import { toRecruitmentFormView, type RecruitmentFormApiResponse } from "./response-mapping";

/*
 * 모집 폼 문항 교체 (#528 · ssccops-server#483 ·
 * `PUT /v1/academic-programs/{id}/recruitment/form`) — **브라우저 전용**.
 *
 * 문항을 고쳐 가며 저장하는 클라이언트 화면(`views/recruitment-form`)에서 일어나므로
 * `apiFetchAuthedFromBrowser`(Supabase 브라우저 세션 토큰)를 쓴다. 조회(`recruitment-form-read.ts`)와
 * 갈리는 것은 **토큰을 어디서 꺼내는가** 하나뿐이고, 응답 → 도메인 변환은 두 파일이
 * `response-mapping.ts`를 함께 쓴다(#128 회차 기록이 세운 규칙).
 *
 * ── 본문은 문항 구성 하나다 ────────────────────────────────
 * 서버가 제목·접수 기간·라벨·다중 응답을 **받지 않는다**. 받지 않으므로 이 경로로는 덮어쓸
 * 수 없고, 그것이 «모집 일정은 학술국장이 정한다»(#528 요구 3)의 서버 쪽 방어선이다 —
 * 화면이 그 입력란을 읽기 전용으로 그리는 것은 그 위에 얹은 한 겹이다.
 *
 * 값을 받아 놓고 무시하는 길을 서버가 기각했으므로(«저장했는데 안 바뀐다»를 만드는 길) 이쪽도
 * 보내지 않는다 — 어드민 편집기의 `toFormSaveInput`처럼 폼 전체를 조립하는 함수가 여기
 * 없는 이유다.
 *
 * **PATCH가 아니라 PUT이다** — 문항 구성은 부분 갱신이 아니라 전체 교체다(어드민
 * `PUT /v1/forms/{formId}`와 같은 판단).
 */
export async function updateRecruitmentFormQuestions(
  academicProgramId: number,
  qitemCpstCn: QitemCpstCn,
): Promise<RecruitmentFormView> {
  const res = await apiFetchAuthedFromBrowser<RecruitmentFormApiResponse>(
    `/v1/academic-programs/${academicProgramId}/recruitment/form`,
    { method: "PUT", body: JSON.stringify({ qitemCpstCn }) },
  );
  return toRecruitmentFormView(res);
}
