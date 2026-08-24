"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createFormTemplate,
  fetchFormTemplate,
  FORM_TEMPLATE_ERROR,
  updateFormTemplate,
} from "@/entities/form-template";
import { syncSessionOnForbidden } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { ApiError } from "@/shared/lib/api/client";
import { toFormTemplateErrorMessage } from "./form-template-error";
import {
  emptyFormTemplateDraft,
  toFormTemplateDraft,
  toFormTemplateSaveInput,
  validateFormTemplateDraft,
  type FormTemplateDraft,
  type FormTemplateDraftIssues,
} from "./template-draft";

/*
 * 템플릿 편집기 상태 (#134 · 등록과 수정이 한 화면).
 *
 * ── 폼 편집기와 갈리는 지점: 자동 저장을 붙이지 않는다 ──────────────
 * 폼 편집기는 자동 저장이다. 접수를 열어 둔 폼을 고치는 도중 브라우저가 닫히면 응답자가 보고
 * 있는 문항이 반쯤 고쳐진 채 남기 때문이다. 템플릿은 그 자리에 놓이지 않는다 — 아무도 보고
 * 있지 않고, 저장 전까지는 어떤 폼에도 영향이 없다. 그래서 **누른 순간에만 저장한다.**
 *
 * 자동 저장을 얹지 않은 데는 계약상의 이유도 있다. 신규 템플릿의 첫 저장은 POST이고 그
 * 응답으로 번호가 생기는데, 저장 버튼이 없으면 사용자는 "지금 몇 번 템플릿을 고치고 있는지"를
 * 알 수 있는 순간이 없다. 대신 저장되지 않은 변경이 남아 있으면 이탈을 경고한다.
 *
 * ── 신규와 수정을 한 훅이 다루는 근거 ──────────────────────────
 * 서버가 생성·수정에 **같은 요청 DTO**를 쓰고(FormTemplateSaveRequest) 화면이 만드는 본문도
 * 같다. 나누면 한쪽에만 필드가 늘어 조용히 어긋난다 — 폼 편집기와 같은 판단이다.
 */

export type FormTemplateEditorStatus = "loading" | "ready" | "not-found" | "error";

export interface FormTemplateEditor {
  status: FormTemplateEditorStatus;
  /** status === "error"일 때만 채워진다 */
  loadErrorMessage: string;
  reload: () => void;
  /** 신규 템플릿은 첫 저장 전까지 null */
  formTmplId: number | null;
  /** 수정 화면에서만 채워진다 — 헤더에 "누가 만들었나"를 보여 준다 */
  creatrMbrNm: string;
  draft: FormTemplateDraft;
  setDraft: (updater: (draft: FormTemplateDraft) => FormTemplateDraft) => void;
  issues: FormTemplateDraftIssues;
  saving: boolean;
  /** 마지막 저장이 실패한 사유. 비어 있으면 정상 */
  saveErrorMessage: string;
  /** 저장된 템플릿 번호. 검증에 걸렸거나 실패하면 null */
  save: () => Promise<number | null>;
  /** 저장되지 않은 변경이 있는가 (이탈 경고 기준) */
  dirty: boolean;
}

/** 로드 결과 + 그 결과를 만든 요청의 식별자 (use-form-editor.ts의 파생 로딩 패턴과 같다) */
interface LoadedTemplate {
  key: string;
  outcome: Exclude<FormTemplateEditorStatus, "loading">;
  errorMessage: string;
  draft: FormTemplateDraft;
  creatrMbrNm: string;
}

function payloadKeyOf(draft: FormTemplateDraft): string {
  return JSON.stringify(toFormTemplateSaveInput(draft));
}

/** 로드 실패 상태에서도 draft 자리를 비워 두지 않는다 — 화면이 옵셔널 체이닝으로 뒤덮이지 않게 */
function placeholderTemplate(
  key: string,
  outcome: Exclude<FormTemplateEditorStatus, "loading" | "ready">,
  errorMessage: string,
): LoadedTemplate {
  return {
    key,
    outcome,
    errorMessage,
    draft: emptyFormTemplateDraft(),
    creatrMbrNm: "",
  };
}

/** 로드 전·실패 시 화면이 쓰는 자리표시 초안. 매 렌더 새로 만들면 검증이 계속 다시 돈다 */
const EMPTY_DRAFT: FormTemplateDraft = emptyFormTemplateDraft();

export function useFormTemplateEditor(formTmplId?: number): FormTemplateEditor {
  /*
   * URL의 번호는 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는 템플릿으로 끊는다
   * (use-form-editor.ts와 같은 판단).
   */
  const loadableId =
    formTmplId !== undefined && Number.isInteger(formTmplId) && formTmplId > 0
      ? formTmplId
      : null;
  const isNewTemplate = formTmplId === undefined;

  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${formTmplId ?? "new"}|${reloadKey}`;

  const [loaded, setLoaded] = useState<LoadedTemplate | null>(() =>
    isNewTemplate
      ? {
          key: "new|0",
          outcome: "ready",
          errorMessage: "",
          draft: emptyFormTemplateDraft(),
          creatrMbrNm: "",
        }
      : null,
  );

  /** 마지막으로 저장에 성공한 본문의 키. 신규는 "빈 초안 그대로"를 저장된 것으로 친다 */
  const [savedKey, setSavedKey] = useState<string>(() =>
    isNewTemplate ? payloadKeyOf(emptyFormTemplateDraft()) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  /** 첫 저장(POST)으로 받은 템플릿 번호. 이후 저장은 이 값으로 PUT 한다 */
  const [createdId, setCreatedId] = useState<number | null>(null);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* ── 로드 ─────────────────────────────────────────────────── */

  useEffect(() => {
    if (isNewTemplate) return;

    let alive = true;

    if (loadableId === null) {
      // 잘못된 주소 — 조회 없이 끝낸다. 이펙트 본문이 아닌 마이크로태스크에서 반영한다
      void Promise.resolve().then(() => {
        if (alive) setLoaded(placeholderTemplate(requestKey, "not-found", ""));
      });
      return () => {
        alive = false;
      };
    }

    fetchFormTemplate(loadableId)
      .then((template) => {
        if (!alive) return;
        const draft = toFormTemplateDraft(template);
        // 불러온 그대로는 이미 저장된 내용이다 — 진입만 하고 나가도 경고가 뜨면 안 된다
        setSavedKey(payloadKeyOf(draft));
        setLoaded({
          key: requestKey,
          outcome: "ready",
          errorMessage: "",
          draft,
          creatrMbrNm: template.creatrMbrNm,
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const notFound =
          error instanceof ApiError &&
          error.code === FORM_TEMPLATE_ERROR.FORM_TEMPLATE_NOT_FOUND;
        setLoaded(
          placeholderTemplate(
            requestKey,
            notFound ? "not-found" : "error",
            notFound ? "" : toFormTemplateErrorMessage(error),
          ),
        );
      });

    return () => {
      alive = false;
    };
  }, [isNewTemplate, loadableId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: FormTemplateEditorStatus = current?.outcome ?? "loading";
  const draft = current?.draft ?? EMPTY_DRAFT;

  /* ── 편집 ─────────────────────────────────────────────────── */

  const setDraft = useCallback(
    (updater: (draft: FormTemplateDraft) => FormTemplateDraft) => {
      setLoaded((prev) =>
        prev?.outcome === "ready" ? { ...prev, draft: updater(prev.draft) } : prev,
      );
    },
    [],
  );

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const issues = useMemo(() => validateFormTemplateDraft(draft), [draft]);
  const payloadKey = useMemo(() => payloadKeyOf(draft), [draft]);
  const dirty = status === "ready" && payloadKey !== savedKey;

  /* ── 저장 ─────────────────────────────────────────────────── */

  /** 저장 함수가 실행 시점에 읽을 최신값. 렌더마다 갱신한다(의존성 배열 없음) */
  const contextRef = useRef({ draft, payloadKey, blockingMessage: issues.blockingMessage });
  useEffect(() => {
    contextRef.current = { draft, payloadKey, blockingMessage: issues.blockingMessage };
  });

  /** 저장 대상 번호. null이면 아직 만들어지지 않은 템플릿이다 */
  const idRef = useRef<number | null>(loadableId);
  /** 같은 틱에 두 번 눌린 저장은 렌더 사이가 없어 상태로 막을 수 없다 — 차단은 ref로 한다 */
  const busyRef = useRef(false);

  const save = useCallback(async (): Promise<number | null> => {
    const { draft: current, payloadKey: key, blockingMessage } = contextRef.current;

    // 보내 봐야 거절당할 요청이다. 사유는 화면이 이미 들고 있으므로 여기서는 보내지 않는다
    if (blockingMessage) return null;
    if (busyRef.current) return null;

    busyRef.current = true;
    setSaving(true);
    setSaveErrorMessage("");

    try {
      const input = toFormTemplateSaveInput(current);
      const targetId = idRef.current;
      const saved =
        targetId === null
          ? await createFormTemplate(input)
          : await updateFormTemplate(targetId, input);

      if (targetId === null) {
        /*
         * 첫 저장 잠금. 이 대입 이후로 이 편집기는 절대 POST를 다시 내지 않는다 — 안 그러면
         * 저장을 두 번 누른 사람에게 같은 템플릿이 두 개 생긴다.
         */
        idRef.current = saved.formTmplId;
        if (aliveRef.current) {
          setCreatedId(saved.formTmplId);
          /*
           * router.replace가 아니라 History API를 쓴다(폼 편집기와 같은 이유) — 라우트가 바뀌면
           * 화면이 다시 마운트되어 방금 저장한 사용자의 입력 포커스와 펼쳐 둔 문항 카드가
           * 통째로 사라진다. 새로고침 시점부터는 정상적으로 수정 주소가 열린다.
           */
          window.history.replaceState(
            null,
            "",
            ROUTES.formTemplateEdit(saved.formTmplId),
          );
        }
      }

      if (aliveRef.current) setSavedKey(key);
      return saved.formTmplId;
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      if (aliveRef.current) setSaveErrorMessage(toFormTemplateErrorMessage(error));
      return null;
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setSaving(false);
    }
  }, []);

  /*
   * 이탈 경고. 자동 저장이 없으므로 고친 내용은 저장을 누르기 전까지 어디에도 없다.
   * 브라우저가 문구를 정하므로 여기서는 "막겠다"는 표시만 한다.
   */
  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return {
    status,
    loadErrorMessage: current?.errorMessage ?? "",
    reload,
    formTmplId: createdId ?? loadableId,
    creatrMbrNm: current?.creatrMbrNm ?? "",
    draft,
    setDraft,
    issues,
    saving,
    saveErrorMessage,
    save,
    dirty,
  };
}
