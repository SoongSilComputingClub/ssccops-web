"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import {
  createSubWork,
  EXTERNAL_LINK_MAX_LENGTH,
  type SubWorkCreateInput,
} from "@/entities/sub-work";
import { toSubWorkCreateErrorMessage } from "./sub-work-error";

/*
 * 하위 업무 등록 훅 (OPS-007 · POST /v1/sub-works).
 *
 * 구조는 features/work의 use-create-work와 같다 — 토스트를 여기서 띄우지 않고 결과 문구를
 * 돌려주며, 성공했을 때 화면을 어디로 옮길지는 뷰가 정한다.
 *
 * 진행 중 잠금(inFlightRef)이 필요한 이유도 같다: 등록은 **연타하면 같은 내용의 하위 업무가
 * 여러 건 만들어진다** — 중복을 막을 유니크 제약이 없고(제목이 같은 하위 업무는 정상이다),
 * 되돌리는 API도 아직 없다. 게다가 하위 업무는 상위 업무의 진행률 분모라, 중복 등록은
 * 그 업무의 진행률까지 함께 틀어 놓는다.
 */

export interface SubWorkCreation {
  /** 성공했을 때 등록된 하위 업무 ID. 실패·중복 클릭이면 null */
  subWorkId: number | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface SubWorkCreateControl {
  pending: boolean;
  create: (input: SubWorkCreateInput) => Promise<SubWorkCreation>;
}

const BUSY: SubWorkCreation = { subWorkId: null, message: "" };

/**
 * 외부_URL_주소 선검사.
 *
 * 서버도 `@URL`로 막지만 그 거절 문구는 Bean Validation 기본 메시지("must be a valid URL")라
 * 영문 그대로 화면에 뜬다 — 왕복 한 번을 기다려 영어 문장을 받느니 여기서 먼저 끊는다.
 * 프로토콜을 http(s)로 좁히는 것은 이 칸이 '문서 · 시트 링크'이기 때문이다.
 * 비어 있으면 선택 입력이므로 통과다.
 */
function externalLinkError(externalLink: string | null): string {
  const value = externalLink?.trim() ?? "";
  if (!value) return "";
  if (value.length > EXTERNAL_LINK_MAX_LENGTH) {
    return `외부_URL_주소는 ${EXTERNAL_LINK_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  try {
    const { protocol } = new URL(value);
    if (protocol !== "http:" && protocol !== "https:") {
      return "외부_URL_주소는 http:// 또는 https:// 로 시작해야 합니다";
    }
  } catch {
    return "외부_URL_주소가 올바른 주소 형식이 아닙니다";
  }
  return "";
}

export function useCreateSubWork(): SubWorkCreateControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const create = useCallback(
    async (input: SubWorkCreateInput): Promise<SubWorkCreation> => {
      /*
       * 클라이언트 선검사는 서버 판정을 대신하지 않는다 — 통과해도 아래 catch가 서버 코드로
       * 다시 문구를 정한다(꺼진 유형·담당자 부적격은 여기서 알 수 없다).
       */
      const linkError = externalLinkError(input.externalLink);
      if (linkError) return { subWorkId: null, message: linkError };

      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const created = await createSubWork(input);
        /*
         * 승인_상태는 고른 유형이 정한다 — 승인이 필요한 유형이면 등록 시점부터 대기(PENDING)라
         * 담당자가 착수해도 완료 승인은 승인자 차례를 기다린다. 등록 화면에 상태 입력란이
         * 없는 것도 같은 이유다(업무_상태는 서버가 기획으로 고정한다).
         */
        const pendingApproval = created.approvalStatus === "PENDING";
        return {
          subWorkId: created.subWorkId,
          message: pendingApproval
            ? "하위 업무를 등록했습니다 · 승인 대기 상태입니다"
            : "하위 업무를 등록했습니다",
        };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { subWorkId: null, message: toSubWorkCreateErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, create };
}
