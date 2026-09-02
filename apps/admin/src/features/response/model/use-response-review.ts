"use client";

import { useCallback, useRef, useState } from "react";
import { reviewFormResponse, type FormResponseReviewInput } from "@/entities/response";
import { syncSessionOnForbidden } from "@/entities/session";
import { toResponseErrorMessage } from "./response-error";

/*
 * 응답 검토 처리 훅 (ssccops-server #141).
 *
 * `useResponseStatusChange`를 대체한다. 상태 한 필드를 고치는 요청이 아니라 '검토 처리'라는
 * 사건을 남기는 요청이 됐고(POST .../reviews), 결론과 검토 의견이 한 요청으로 나간다.
 *
 * 조회 훅들과 달리 이펙트가 없다 — 사용자가 버튼을 누른 순간에만 요청이 나가므로 여기서는
 * setState를 이벤트 핸들러 안에서 부른다(이펙트 본문이 아니라서 set-state-in-effect 규칙과
 * 무관하다).
 *
 * ── 중복 클릭을 ref로도 막는 이유 ──────────────────────────────
 * `saving` state만으로 버튼을 비활성화하면 같은 틱 안에 두 번 들어온 클릭은 둘 다 통과한다
 * (setState는 즉시 반영되지 않는다). 검토가 두 번 나가면 두 번째는 서버에서 400
 * INVALID_RESPONSE_STATUS_TRANSITION으로 거절되므로(같은 상태로의 재지정) 사용자는 성공한
 * 조작에 대해 오류 문구를 보게 된다 — 렌더용 플래그와 별개로 ref를 실제 관문으로 둔다.
 */

export interface ResponseReview {
  /** 요청이 진행 중인지 — 버튼 비활성화 표시용 */
  saving: boolean;
  /** 성공하면 빈 문자열, 실패하면 화면에 띄울 메시지를 돌려준다 */
  review: (
    formId: number,
    formRspnsId: number,
    input: FormResponseReviewInput,
  ) => Promise<string>;
}

export function useResponseReview(): ResponseReview {
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const review = useCallback(
    async (
      formId: number,
      formRspnsId: number,
      input: FormResponseReviewInput,
    ): Promise<string> => {
      if (inFlight.current) return "";
      inFlight.current = true;
      setSaving(true);

      try {
        await reviewFormResponse(formId, formRspnsId, input);
        return "";
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return toResponseErrorMessage(error);
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
    [],
  );

  return { saving, review };
}
