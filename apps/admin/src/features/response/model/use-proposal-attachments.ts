"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchProposalAttachmentDownloadUrl,
  fetchProposalAttachments,
  type ProposalAttachment,
} from "@/entities/response";
import { syncSessionOnForbidden } from "@/entities/session";
import { proposalAttachmentErrorMessage } from "./proposal-attachment-error";

/*
 * 기획안 검토 화면의 첨부 자료 — 목록 + 내려받기 (web#805 · server#685).
 *
 * 응답 상세(`useResponseDetail`)에 얹지 않고 따로 부른다 — 첨부를 못 받았다고 기획안 본문·검토
 * 패널이 막히면 안 된다. 읽기만 한다(올리기·지우기는 작성자 본인의 일 · lms).
 *
 * 내려받기는 운영 건 첨부(`features/attachment`)와 같은 방식이다 — 누를 때마다 서명 URL을 받아
 * `window.location.assign`. 서명에 `attachment`와 원본 이름이 들어 있어 화면이 벗어나지 않고 저장
 * 대화상자만 뜬다. 브라우저 안에서 열지 않는다(md 렌더·pdf 내장 뷰어 없음).
 *
 * `loading`은 키가 맞는 결과가 없을 때로 파생한다(`useResponseDetail`과 같은 모양).
 */

export type ProposalAttachmentsStatus = "loading" | "ready" | "error";

interface Loaded {
  key: string;
  outcome: Exclude<ProposalAttachmentsStatus, "loading">;
  items: ProposalAttachment[];
  errorMessage: string;
}

const NO_ITEMS: ProposalAttachment[] = [];

export function useProposalAttachments(formId: number, formRspnsId: number) {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${formId}|${formRspnsId}|${reloadKey}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const inFlightRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchProposalAttachments(formId, formRspnsId)
      .then((list) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            outcome: "ready",
            items: list.attachments,
            errorMessage: "",
          });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          outcome: "error",
          items: NO_ITEMS,
          errorMessage: proposalAttachmentErrorMessage(error),
        });
      });
    return () => {
      alive = false;
    };
  }, [formId, formRspnsId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;

  const download = useCallback(
    async (fileId: number) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setBusy(true);
      setActionError("");
      try {
        const url = await fetchProposalAttachmentDownloadUrl(formId, formRspnsId, fileId);
        window.location.assign(url);
      } catch (error: unknown) {
        syncSessionOnForbidden(error);
        setActionError(proposalAttachmentErrorMessage(error));
      } finally {
        inFlightRef.current = false;
        setBusy(false);
      }
    },
    [formId, formRspnsId],
  );

  return {
    status: current?.outcome ?? "loading",
    items: current?.items ?? NO_ITEMS,
    errorMessage: current?.errorMessage ?? "",
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
    busy,
    actionError,
    download,
  };
}
