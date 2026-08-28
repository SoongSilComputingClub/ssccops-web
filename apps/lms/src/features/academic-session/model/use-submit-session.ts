"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fileExtOf,
  issueSessionPhotoTicket,
  putSessionPhoto,
  resubmitAcademicSession,
  submitAcademicSession,
  type SessionSubmitBody,
} from "@/entities/academic-session";
import {
  sessionPhotoErrorMessage,
  submitSessionErrorMessage,
} from "./session-record-error";

/*
 * 회차 기록 제출 오케스트레이션 (#128).
 *
 * 화면의 "제출" 버튼은 하나지만, 내부적으로는 **회차 기록 저장 → 인증사진 업로드** 두 단계다.
 *
 * ── 왜 사진이 먼저가 아니라 나중인가 ────────────────────────
 * 이슈·서버 #135는 "사진 업로드가 먼저 끝난 뒤 세션 제출"이라고 적었지만, 발급 경로가
 * `POST .../sessions/{sessionId}/file-reference`라 **`sessionId`가 있어야 한다**. 신규 제출
 * (`NOT_SUBMITTED`)에는 아직 `sessionId`가 없으므로 회차 기록을 먼저 제출해 `sessionId`를 받아야
 * 사진을 올릴 수 있다. 재제출도 순서를 맞춰 같은 흐름을 쓴다.
 *   - 사진 없이 제출하면 회차 기록만 저장하고 끝난다.
 *   - 사진 단계에서 실패하면 **회차 기록은 이미 저장된 상태다** — 실패 문구가 그 사실을 함께
 *     알린다(`sessionPhotoErrorMessage`). 재업로드는 UPSERT라 출석부 정정 화면(후속)에서 다시
 *     올릴 수 있다.
 *
 * ── 임시저장·자동 저장이 없다 ────────────────────────────────
 * 서버에 초안 개념이 없다(POST/PUT 둘뿐 · 이슈 「지킬 것」). 이 훅은 자동 저장 뼈대(디바운스·
 * 재시도 큐)를 두지 않는다 — 신청 흐름(`use-apply-form`)과 갈리는 지점이다.
 *
 * ── 연타 잠금 ────────────────────────────────────────────────
 * 제출은 멱등하지 않다(신규 제출을 두 번 하면 서버가 409로 끊지만 화면이 그 사이 두 번 나가면
 * 안 된다). `inFlightRef`로 진행 중 재호출을 막는다.
 */

/** POST/PUT 분기용 — 신규 제출인지 재제출인지 */
export type SubmitMode = "create" | "resubmit";

export interface SubmitSessionInput {
  mode: SubmitMode;
  /** 재제출일 때 필수 — 대상 회차 PK */
  sessionId: number | null;
  body: SessionSubmitBody;
  /** 새로 고른 인증사진. 없으면 사진 단계를 건너뛴다 */
  photo: File | null;
}

export type SubmitSessionOutcome =
  /** 회차 기록·사진(있으면) 모두 성공 */
  | { result: "submitted" }
  /** 회차 기록은 저장됐지만 사진 업로드만 실패 — 화면은 '내 활동'으로 보내되 경고를 남긴다 */
  | { result: "submitted-photo-failed"; message: string }
  /** 회차 기록 저장 자체가 실패 — 폼에 머무른다 */
  | { result: "failed"; message: string };

export interface SubmitSessionControl {
  submitting: boolean;
  submit: (input: SubmitSessionInput) => Promise<SubmitSessionOutcome>;
}

export function useSubmitSession(academicProgramId: number): SubmitSessionControl {
  const [submitting, setSubmitting] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const submit = useCallback(
    async (input: SubmitSessionInput): Promise<SubmitSessionOutcome> => {
      if (inFlightRef.current) {
        return { result: "failed", message: "제출을 처리하는 중입니다. 잠시만 기다려주세요" };
      }
      inFlightRef.current = true;
      setSubmitting(true);

      try {
        /* ── 1) 회차 기록 저장 ───────────────────────────── */
        let sessionId: number;
        try {
          if (input.mode === "resubmit") {
            if (input.sessionId === null) {
              return {
                result: "failed",
                message: "재제출할 회차를 찾을 수 없습니다 — 화면을 새로고침해주세요",
              };
            }
            const detail = await resubmitAcademicSession(
              academicProgramId,
              input.sessionId,
              input.body,
            );
            sessionId = detail.sessionId;
          } else {
            const detail = await submitAcademicSession(academicProgramId, input.body);
            sessionId = detail.sessionId;
          }
        } catch (error: unknown) {
          return { result: "failed", message: submitSessionErrorMessage(error) };
        }

        /* ── 2) 인증사진 업로드 (있을 때만) ──────────────── */
        if (input.photo === null) {
          return { result: "submitted" };
        }

        try {
          const ticket = await issueSessionPhotoTicket(
            academicProgramId,
            sessionId,
            fileExtOf(input.photo),
          );
          await putSessionPhoto(ticket.uploadUrl, input.photo, ticket.contentType);
          return { result: "submitted" };
        } catch (error: unknown) {
          return {
            result: "submitted-photo-failed",
            message: sessionPhotoErrorMessage(error),
          };
        }
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setSubmitting(false);
      }
    },
    [academicProgramId],
  );

  return { submitting, submit };
}
