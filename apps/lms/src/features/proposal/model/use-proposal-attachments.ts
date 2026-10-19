"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROPOSAL_ATTACHMENT_ERROR,
  type ProposalAttachmentList,
} from "@/entities/response";
import {
  deleteProposalAttachment,
  fetchProposalAttachmentDownloadUrl,
  fetchProposalAttachments,
  issueProposalAttachment,
  putProposalAttachment,
} from "@/entities/response/api/proposal-attachments";
import { ApiError } from "@/shared/api/client";
import { proposalAttachmentErrorMessage } from "./proposal-attachment-error";

/*
 * 기획안 첨부 목록 + 올리기·지우기·내려받기 (web#805 · server#685).
 *
 * 세 자리가 같은 훅을 쓴다 — 신규 작성(`/proposals/new` · 초안), 재제출(수정요청 응답), 상세의 읽기
 * 전용 목록. 갈리는 것은 대상 id를 언제 아는가뿐이다.
 *
 * ── 대상 id가 없을 수 있다 (신규 작성) ──────────────────────
 * 첨부는 응답 **행**에 붙는다. 처음 연 작성 화면에는 초안 행이 아직 없어(`formRspnsId === null`)
 * 목록도 상한도 물을 곳이 없다 — 그동안은 목록을 부르지 않는다. 올리기를 누르면 `ensureTarget`
 * (작성 폼 훅의 자동 저장 큐)이 초안을 한 번 저장해 id를 받아 온다. 큐를 거치는 것은 자동 저장·
 * 제출과 순서가 엇갈리지 않게 하려는 것이다(`use-proposal-form.ts`). 첫 자동 저장이 성공해 부모가
 * id를 알게 되면 그때 목록을 받는다.
 *
 * ── 목록은 서버 값으로 다시 받는다 ──────────────────────────
 * 올리기·지우기마다 목록을 다시 받는다 — 사용량(`totalSize`)을 화면이 더하고 빼지 않는다. 다시 받는
 * 동안에도 직전 목록을 그대로 둔다(«불러오는 중»으로 깜빡이지 않게). 요청이 겹치면 **나중에 보낸
 * 것이 이긴다**(`seq`) — 초안 id가 막 생긴 순간 부모의 목록 조회와 올리기 뒤 다시 받기가 겹치는데,
 * 먼저 보낸 쪽이 늦게 도착해 방금 올린 파일이 빠진 목록으로 덮어쓰지 않게 한다.
 *
 * ── 웹이 판정하지 않는다 ─────────────────────────────────────
 * 형식·크기·개수는 서버가 판정한다(lms AGENTS · 출석 인증사진 #128). 남은 용량보다 큰 파일도 발급
 * 요청을 보내고 413의 문장(남은 용량 포함)을 그대로 보인다.
 */

export type ProposalAttachmentsStatus = "idle" | "loading" | "ready" | "error";

export interface ProposalAttachmentsOptions {
  formId: number;
  /** 대상 응답 — 신규 작성에서 초안이 아직 없으면 null */
  formRspnsId: number | null;
  /** SSR 로더가 받아 온 첫 목록. 없거나 null(서버에서 실패)이면 브라우저가 받는다 */
  initial?: ProposalAttachmentList | null;
  /** 올리기 전에 대상 id를 확보한다 — 신규 작성의 초안 저장. 없으면 `formRspnsId`가 있어야 올린다 */
  ensureTarget?: () => Promise<number>;
}

export interface ProposalAttachments {
  status: ProposalAttachmentsStatus;
  /** 마지막으로 받은 목록 — 다시 받는 동안에도 남는다 */
  list: ProposalAttachmentList | null;
  loadError: string;
  reload: () => void;
  /** 올리기·지우기·내려받기 중 */
  busy: boolean;
  /** 마지막 동작의 실패 한 줄 */
  actionError: string;
  upload: (file: File) => Promise<void>;
  remove: (fileId: number) => Promise<void>;
  download: (fileId: number) => Promise<void>;
}

export function useProposalAttachments({
  formId,
  formRspnsId,
  initial,
  ensureTarget,
}: ProposalAttachmentsOptions): ProposalAttachments {
  const [list, setList] = useState<ProposalAttachmentList | null>(initial ?? null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  /** 보낸 목록 요청의 순번 · 화면에 반영한 마지막 순번 */
  const seqRef = useRef(0);
  const appliedRef = useRef(0);
  /** SSR이 이미 준 대상 — 그 대상의 첫 조회는 보내지 않는다 */
  const skipFirstRef = useRef(initial ? formRspnsId : null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /** 목록을 받아 반영한다 — 늦게 도착한 옛 요청은 버린다 */
  const loadInto = useCallback(
    async (targetId: number): Promise<void> => {
      seqRef.current += 1;
      const seq = seqRef.current;
      const next = await fetchProposalAttachments(formId, targetId);
      if (!aliveRef.current || seq < appliedRef.current) return;
      appliedRef.current = seq;
      setList(next);
      setLoadError("");
    },
    [formId],
  );

  useEffect(() => {
    if (formRspnsId === null) return;
    if (skipFirstRef.current === formRspnsId) {
      skipFirstRef.current = null;
      return;
    }
    loadInto(formRspnsId).catch((error: unknown) => {
      if (aliveRef.current) setLoadError(proposalAttachmentErrorMessage(error));
    });
  }, [formRspnsId, reloadKey, loadInto]);

  const reload = useCallback(() => {
    setLoadError("");
    setReloadKey((k) => k + 1);
  }, []);

  const run = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setBusy(true);
      setActionError("");
      try {
        await action();
      } catch (error: unknown) {
        if (!aliveRef.current) return;
        setActionError(proposalAttachmentErrorMessage(error));
        // 그 사이 지워진 파일이면 목록이 낡았다 — 다시 받는다
        if (error instanceof ApiError && error.code === PROPOSAL_ATTACHMENT_ERROR.NOT_FOUND) {
          setReloadKey((k) => k + 1);
        }
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setBusy(false);
      }
    },
    [],
  );

  const upload = useCallback(
    (file: File) =>
      run(async () => {
        const targetId = formRspnsId ?? (ensureTarget ? await ensureTarget() : null);
        if (targetId === null) {
          throw new ApiError(PROPOSAL_ATTACHMENT_ERROR.TARGET_UNAVAILABLE, "", 0);
        }
        const ticket = await issueProposalAttachment(formId, targetId, {
          fileName: file.name,
          fileSize: file.size,
        });
        try {
          await putProposalAttachment(ticket.uploadUrl, file, ticket.contentType);
        } catch (error: unknown) {
          // 발급이 곧 참조 행이라 PUT이 실패하면 빈 항목이 남는다 — 바로 치운다(운영 건 첨부와 같다)
          await deleteProposalAttachment(formId, targetId, ticket.fileId).catch(() => {});
          throw error;
        }
        await loadInto(targetId);
      }),
    [formId, formRspnsId, ensureTarget, run, loadInto],
  );

  const remove = useCallback(
    (fileId: number) =>
      run(async () => {
        if (formRspnsId === null) return;
        await deleteProposalAttachment(formId, formRspnsId, fileId);
        await loadInto(formRspnsId);
      }),
    [formId, formRspnsId, run, loadInto],
  );

  const download = useCallback(
    (fileId: number) =>
      run(async () => {
        if (formRspnsId === null) return;
        const url = await fetchProposalAttachmentDownloadUrl(formId, formRspnsId, fileId);
        window.location.assign(url);
      }),
    [formId, formRspnsId, run],
  );

  let status: ProposalAttachmentsStatus;
  if (list) status = "ready";
  else if (loadError) status = "error";
  else if (formRspnsId === null) status = "idle";
  else status = "loading";

  return { status, list, loadError, reload, busy, actionError, upload, remove, download };
}
