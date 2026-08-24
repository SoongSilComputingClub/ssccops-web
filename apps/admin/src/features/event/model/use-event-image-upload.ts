"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { issueEventImageTicket, putEventImage } from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { toEventImageUploadErrorMessage } from "./event-error";

/*
 * 행사 이미지 업로드 훅 (ssccops#141 · POST /v1/events/{eventId}/images → R2 PUT).
 *
 * 두 단계를 한 동작으로 묶는다 — 발급받은 주소는 만료가 짧고 한 번만 쓰이므로, 발급과
 * 업로드 사이에 화면이 끼어들 자리가 없다(허가증을 상태로 들고 있으면 만료된 주소로
 * 재시도하게 된다).
 *
 * 다른 저장 훅들과 같이 토스트를 여기서 띄우지 않고 결과를 돌려준다 — 올린 주소를 본문에
 * 넣을지 대표 이미지에 넣을지는 부르는 쪽이 정한다.
 *
 * 진행 중 잠금(inFlightRef)은 연타를 막는다 — 업로드는 멱등하지 않아 연타가 곧 버킷의
 * 쓰이지 않는 파일이다.
 */

export interface EventImageUpload {
  /** 성공했을 때 본문·대표 이미지에 넣을 공개 주소. 실패·중복 클릭이면 null */
  publicUrl: string | null;
  /** 실패했을 때 보여줄 한 줄. 성공했거나 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface EventImageUploadControl {
  pending: boolean;
  /** 발급 → R2 PUT → 공개 주소. 실패해도 던지지 않고 문구로 돌려준다 */
  upload: (eventId: number, file: File) => Promise<EventImageUpload>;
}

const BUSY: EventImageUpload = { publicUrl: null, message: "" };

export function useEventImageUpload(): EventImageUploadControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const upload = useCallback(
    async (eventId: number, file: File): Promise<EventImageUpload> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        /*
         * 형식·용량을 여기서 먼저 판정하지 않는다 — 허용 목록과 상한은 서버에만 있고
         * (AGENTS.md의 "규칙을 두 벌로 만들지 않는다"), 웹이 복제하면 서버가 규칙을 넓힌
         * 날에도 화면만 계속 막는다. 최종 판정은 서버 응답 코드로 안내한다.
         *
         * contentType은 발급과 PUT에 **같은 값**을 쓴다 — 서명에 포함된 헤더라 어긋나면
         * R2가 거절한다. 브라우저가 형식을 못 읽은 파일은 빈 문자열이 되는데, 그것도
         * 그대로 보내 서버가 UNSUPPORTED_IMAGE_TYPE으로 판정하게 둔다.
         */
        const contentType = file.type;
        const ticket = await issueEventImageTicket(eventId, {
          fileName: file.name,
          contentType,
          fileSize: file.size,
        });

        await putEventImage(ticket.uploadUrl, file, contentType);
        return { publicUrl: ticket.publicUrl, message: "" };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { publicUrl: null, message: toEventImageUploadErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, upload };
}
