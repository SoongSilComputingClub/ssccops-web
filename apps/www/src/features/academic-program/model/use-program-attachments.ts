"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProposalAttachment } from "@/entities/academic-program";
import {
  fetchProgramAttachmentDownloadUrl,
  fetchProgramAttachments,
} from "@/entities/academic-program/api/program-attachments";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { ApiError } from "@/shared/api/client";
import {
  PROGRAM_ATTACHMENTS_LOAD_FAILED,
  programAttachmentErrorMessage,
} from "./program-attachment-error";

/*
 * 학술 프로그램 상세의 첨부 자료 (web#805 · server#685).
 *
 * ── 그리지 않는 경우를 상태로 둔다 (`hidden`) ────────────────
 * 첨부는 **회원에게만** 열린다(ssccops#607 — 익명에게는 목록·개수·이름 모두 주지 않는다). 토큰이
 * 없으면 요청 없이 `CLIENT_UNAUTHENTICATED`가 오고, 가입하지 않은 사람은 403 `SIGNUP_REQUIRED`가
 * 온다 — 둘 다 «첨부 자료를 볼 수 없습니다» 같은 안내를 띄우지 않고 절을 통째로 감춘다. 첨부가
 * 없는 프로그램에도 안내가 뜨면 거짓 안내다(«검토했으나 택하지 않은 길»). 남은 403·404(권한·없는
 * 프로그램)도 같다 — 이 절은 행사 상세의 덧붙임이라, 못 그리는 이유를 화면이 설명할 자리가 아니다.
 *
 * `loading`은 상태로 저장하지 않고 **키가 맞는 결과가 없으면 loading**으로 파생한다
 * (`useMyResponses`와 같은 모양 · `react-hooks/set-state-in-effect`).
 */

export type ProgramAttachmentsStatus = "loading" | "hidden" | "ready" | "error";

interface Loaded {
  key: string;
  outcome: Exclude<ProgramAttachmentsStatus, "loading">;
  items: ProposalAttachment[];
}

const NO_ITEMS: ProposalAttachment[] = [];

/** 이 절을 감추는 실패인가 — 익명·미가입·권한 없음·없는 프로그램 */
function isHiddenFailure(error: unknown): boolean {
  if (isUnauthenticated(error) || isSignupRequired(error)) return true;
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}

export function useProgramAttachments(academicProgramId: number) {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${academicProgramId}|${reloadKey}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const inFlightRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchProgramAttachments(academicProgramId)
      .then((list) => {
        if (alive) setLoaded({ key: requestKey, outcome: "ready", items: list.attachments });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          outcome: isHiddenFailure(error) ? "hidden" : "error",
          items: NO_ITEMS,
        });
      });
    return () => {
      alive = false;
    };
  }, [academicProgramId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;

  /** 누를 때마다 서명 URL을 새로 받는다 — 15분이면 만료된다 */
  const download = useCallback(
    async (fileId: number) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setBusy(true);
      setActionError("");
      try {
        const url = await fetchProgramAttachmentDownloadUrl(academicProgramId, fileId);
        window.location.assign(url);
      } catch (error: unknown) {
        setActionError(programAttachmentErrorMessage(error));
      } finally {
        inFlightRef.current = false;
        setBusy(false);
      }
    },
    [academicProgramId],
  );

  return {
    status: current?.outcome ?? "loading",
    items: current?.items ?? NO_ITEMS,
    loadError: current?.outcome === "error" ? PROGRAM_ATTACHMENTS_LOAD_FAILED : "",
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
    busy,
    actionError,
    download,
  };
}
