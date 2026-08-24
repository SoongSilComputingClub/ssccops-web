"use client";

import { useCallback, useRef, useState } from "react";
import { updateFormResponseStatus } from "@/entities/response";
import { syncSessionOnForbidden } from "@/entities/session";
import type { RspnsSttsCd } from "@/shared/config/codes";
import { toResponseErrorMessage } from "./response-error";

/*
 * 응답 상태 변경 훅.
 *
 * 조회 훅들과 달리 이펙트가 없다 — 사용자가 버튼을 누른 순간에만 요청이 나가므로 여기서는
 * setState를 이벤트 핸들러 안에서 부른다(이펙트 본문이 아니라서 set-state-in-effect 규칙과
 * 무관하다).
 *
 * ── 중복 클릭을 ref로도 막는 이유 ──────────────────────────────
 * `saving` state만으로 버튼을 비활성화하면 같은 틱 안에 두 번 들어온 클릭은 둘 다 통과한다
 * (setState는 즉시 반영되지 않는다). 심사 결과가 두 번 나가는 것은 서버에서 400이 나거나
 * 조용히 두 번 갱신되는 문제라, 렌더용 플래그와 별개로 ref를 실제 관문으로 둔다.
 */

export interface ResponseStatusChange {
  /** 요청이 진행 중인지 — 버튼 비활성화 표시용 */
  saving: boolean;
  /** 성공하면 빈 문자열, 실패하면 화면에 띄울 메시지를 돌려준다 */
  change: (
    formId: number,
    formRspnsId: number,
    rspnsSttsCd: RspnsSttsCd,
  ) => Promise<string>;
}

export function useResponseStatusChange(): ResponseStatusChange {
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const change = useCallback(
    async (formId: number, formRspnsId: number, rspnsSttsCd: RspnsSttsCd) => {
      if (inFlight.current) return "";
      inFlight.current = true;
      setSaving(true);

      try {
        await updateFormResponseStatus(formId, formRspnsId, rspnsSttsCd);
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

  return { saving, change };
}
