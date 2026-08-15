"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSubWorkType,
  fetchSubWorkTypes,
  setSubWorkTypeUse,
  SUB_WORK_TYPE_ERROR,
  TYPE_NAME_MAX_LENGTH,
  updateSubWorkType,
  type SubWorkTypeSaveInput,
  type SubWorkTypeSummary,
} from "@/entities/sub-work-type";
import { ApiError } from "@/shared/lib/api/client";
import {
  toSubWorkTypeErrorMessage,
  toSubWorkTypeSaveErrorMessage,
} from "./sub-work-type-error";

/*
 * 하위 업무 유형 관리 화면(/operations/types)의 목록·등록·수정·사용_여부 토글 (OPS-018·019).
 *
 * 구조는 features/form의 use-form-labels와 같다. 같은 모양의 화면(기준 데이터 표 + 사용
 * 토글)이라 페칭 방식·로딩 계산·중복 클릭 잠금의 근거도 그대로다:
 *
 * - **로딩을 setState 하지 않는다.** 조회 결과에 그 결과를 만든 요청의 key를 함께 담아 두고,
 *   지금 필요한 key와 같을 때만 결과로 인정한다 — loading은 저장하는 값이 아니라 렌더 중에
 *   계산되는 값이 된다 (react-hooks/set-state-in-effect).
 * - **변이 뒤에는 목록을 다시 받는다.** 응답으로 배열을 고치지 않는다 — 정렬 순서는 서버가
 *   정하고(등록 순), 승인 정책은 서버가 정리해서(승인 불필요면 승인자·정족수를 지운다)
 *   저장한 값과 저장된 값이 다를 수 있다. 웹이 그 규칙을 흉내 내면 표가 조용히 갈라진다.
 * - 재조회는 requestKey를 **올리지 않는다.** 키를 올리면 표 전체가 "불러오는 중"으로 돌아가
 *   토글 하나에 목록이 통째로 깜빡인다. 사용자가 직접 누르는 재시도(reload)만 로딩을 동반한다.
 *
 * ── 등록·수정을 한 함수(save)로 둔 이유 ────────────────────────
 * 서버가 두 요청에 같은 DTO를 쓰고(SubWorkTypeSaveRequest) 화면도 같은 폼 하나를 쓴다.
 * 훅에서 나누면 "수정은 부분 수정이 아니라 폼 전체 저장"이라는 규칙이 두 곳에 적히고,
 * 한쪽만 고쳐지는 순간 생략한 값이 어느 경로에서는 남고 어느 경로에서는 지워진다.
 */

export type SubWorkTypesStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedSubWorkTypes {
  key: number;
  types: SubWorkTypeSummary[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface SubWorkTypeAdmin {
  types: SubWorkTypeSummary[];
  status: SubWorkTypesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 저장 폼 아래에 붙일 오류. 비어 있으면 정상 */
  saveErrorMessage: string;
  saving: boolean;
  /**
   * 등록(subWorkTypeId === null) · 수정. 성공하면 true —
   * 화면은 이때만 폼을 닫는다(실패한 입력을 지우지 않기 위해).
   */
  save: (subWorkTypeId: number | null, input: SubWorkTypeSaveInput) => Promise<boolean>;
  /** 폼을 새로 열 때 직전 오류를 지운다 */
  clearSaveError: () => void;

  /** 토글 요청이 진행 중인 유형 — 중복 클릭 방지용 */
  isToggling: (subWorkTypeId: number) => boolean;
  /** 마지막 토글이 실패한 사유. 비어 있으면 정상 */
  toggleErrorMessage: string;
  toggle: (type: SubWorkTypeSummary) => Promise<void>;
}

export function useSubWorkTypes(): SubWorkTypeAdmin {
  const [loaded, setLoaded] = useState<LoadedSubWorkTypes | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggleErrorMessage, setToggleErrorMessage] = useState("");
  const [togglingIds, setTogglingIds] = useState<readonly number[]>([]);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /*
   * 관리 화면은 비활성 유형까지 보여 준다 — useYn을 넘기지 않는다. 여기서 활성만 받으면
   * "사용"을 끈 유형이 목록에서 사라져 되돌릴 방법이 없어진다(유형은 삭제가 아니라 비활성화다).
   */
  useEffect(() => {
    let alive = true;

    fetchSubWorkTypes()
      .then((types) => {
        if (alive) setLoaded({ key: requestKey, types, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            types: [],
            errorMessage: toSubWorkTypeErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: SubWorkTypesStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";
  const types = current?.types ?? [];

  /*
   * 변이 함수가 **실행되는 시점**에 읽을 최신값. 렌더마다 갱신한다(의존성 배열 없음) —
   * 콜백 자체는 의존성 없이 한 번만 만들어 두고, 값은 여기서 본다.
   */
  const contextRef = useRef({ types, requestKey });
  useEffect(() => {
    contextRef.current = { types, requestKey };
  });

  /*
   * 중복 제출 잠금은 상태가 아니라 ref로 건다. 같은 틱에 두 번 눌린 클릭은 그 사이에 렌더가
   * 없어 상태 값이 아직 갱신되지 않기 때문이다 — 화면 표시는 상태로, 실제 차단은 ref로 한다.
   */
  const busyRef = useRef({ saving: false, toggling: new Set<number>() });

  /** 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음) */
  const refresh = useCallback(async (): Promise<void> => {
    const key = contextRef.current.requestKey;
    const next = await fetchSubWorkTypes();
    if (aliveRef.current) setLoaded({ key, types: next, errorMessage: "" });
  }, []);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);

  /* ── 등록 · 수정 ──────────────────────────────────────────── */

  const clearSaveError = useCallback(() => setSaveErrorMessage(""), []);

  const save = useCallback(
    async (
      subWorkTypeId: number | null,
      input: SubWorkTypeSaveInput,
    ): Promise<boolean> => {
      const typeName = input.typeName.trim();

      /*
       * 클라이언트 선검사는 남긴다 — 서버도 400·409로 막지만, 왕복 한 번을 기다리지 않고
       * 바로 알려 주는 편이 낫다. **다만 최종 판정은 서버다**: 여기를 통과해도 아래 catch가
       * 서버 코드로 다시 문구를 정한다(동시에 같은 이름을 넣으면 선검사로는 못 막는다).
       */
      if (!typeName) {
        setSaveErrorMessage("유형_명을 입력하세요");
        return false;
      }
      if (typeName.length > TYPE_NAME_MAX_LENGTH) {
        setSaveErrorMessage(`유형_명은 ${TYPE_NAME_MAX_LENGTH}자를 넘을 수 없습니다`);
        return false;
      }
      if (
        contextRef.current.types.some(
          (t) => t.typeName === typeName && t.subWorkTypeId !== subWorkTypeId,
        )
      ) {
        setSaveErrorMessage("이미 있는 유형_명입니다");
        return false;
      }
      /*
       * 승인 정책 조합은 서버 엔티티가 최종 판정한다(INVALID_APPROVAL_POLICY). 여기서 미리
       * 거르는 것은 서버 문장("승인 정책 설정이 올바르지 않습니다")이 두 경우를 구분하지
       * 못하기 때문이다 — 어느 칸을 채워야 하는지는 화면이 알고 있다.
       */
      if (input.approvalNeeded && !input.authorizerRoleCode) {
        setSaveErrorMessage("승인이 필요한 유형은 승인자_역할_코드를 골라야 합니다");
        return false;
      }
      if (
        input.approvalNeeded &&
        input.minAgreeCountNeeded &&
        (input.minAgreeCount === null || input.minAgreeCount < 1)
      ) {
        setSaveErrorMessage("정족수는 1명 이상이어야 합니다");
        return false;
      }
      if (busyRef.current.saving) return false;

      busyRef.current.saving = true;
      setSaving(true);
      setSaveErrorMessage("");

      try {
        const body = { ...input, typeName };
        if (subWorkTypeId === null) {
          await createSubWorkType(body);
        } else {
          await updateSubWorkType(subWorkTypeId, body);
        }
        /*
         * 여기서부터는 이미 서버에 저장된 뒤다. 재조회가 실패해도 저장 자체는 성공이므로
         * false로 돌려주지 않는다 — 실패로 알리면 사용자가 같은 이름을 다시 넣어 409를 본다.
         */
        await refresh().catch((error: unknown) => {
          if (aliveRef.current) setSaveErrorMessage(toSubWorkTypeErrorMessage(error));
        });
        return true;
      } catch (error: unknown) {
        if (aliveRef.current) setSaveErrorMessage(toSubWorkTypeSaveErrorMessage(error));
        /*
         * 없는 유형(404)이면 화면이 들고 있는 목록이 이미 낡았다는 뜻이다 — 사라진 행을
         * 계속 고치게 두지 않고 조용히 다시 받는다. 재조회까지 실패하면 그냥 둔다
         * (원래 오류 문구가 더 도움이 된다).
         */
        if (
          error instanceof ApiError &&
          error.code === SUB_WORK_TYPE_ERROR.SUB_WORK_TYPE_NOT_FOUND
        ) {
          await refresh().catch(() => {});
        }
        return false;
      } finally {
        busyRef.current.saving = false;
        if (aliveRef.current) setSaving(false);
      }
    },
    [refresh],
  );

  /* ── 사용_여부 토글 ───────────────────────────────────────── */

  const toggle = useCallback(
    async (type: SubWorkTypeSummary): Promise<void> => {
      const { subWorkTypeId } = type;
      // 응답이 오기 전에 다시 눌리면 같은 값을 두 번 보내거나 방금 바꾼 값을 되돌리게 된다
      if (busyRef.current.toggling.has(subWorkTypeId)) return;

      busyRef.current.toggling.add(subWorkTypeId);
      setTogglingIds((ids) => [...ids, subWorkTypeId]);
      setToggleErrorMessage("");

      try {
        await setSubWorkTypeUse(subWorkTypeId, !type.useYn);
        // 토글 자체는 끝났다 — 재조회 실패를 토글 실패로 보이게 하지 않는다
        await refresh().catch(() => {});
      } catch (error: unknown) {
        if (aliveRef.current) setToggleErrorMessage(toSubWorkTypeSaveErrorMessage(error));
        if (
          error instanceof ApiError &&
          error.code === SUB_WORK_TYPE_ERROR.SUB_WORK_TYPE_NOT_FOUND
        ) {
          await refresh().catch(() => {});
        }
      } finally {
        busyRef.current.toggling.delete(subWorkTypeId);
        if (aliveRef.current) {
          setTogglingIds((ids) => ids.filter((id) => id !== subWorkTypeId));
        }
      }
    },
    [refresh],
  );

  const isToggling = useCallback(
    (subWorkTypeId: number) => togglingIds.includes(subWorkTypeId),
    [togglingIds],
  );

  return {
    types,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    saveErrorMessage,
    saving,
    save,
    clearSaveError,
    isToggling,
    toggleErrorMessage,
    toggle,
  };
}
