"use client";

import { useMemo, useState } from "react";
import type { QitemCpstCn } from "@ssccops/form-renderer";
import { SectionLabel } from "@ssccops/ui";
import type { RecruitmentFormView } from "@/entities/form";
import { QitemComposer, validateQitemCpst } from "@/features/form";
import { useSaveRecruitmentForm } from "@/features/form/model/use-save-recruitment-form";
import { formatDt } from "@/shared/lib/date";
import { Card, Field, TextField } from "@/shared/ui";

/*
 * 지원서 문항 편집기 — 클라이언트 (#528).
 *
 * ── 초깃값이 곧 서버가 준 값이다 ────────────────────────────
 * SSR 셸이 조회를 끝낸 뒤에만 이 컴포넌트를 마운트하므로, `useState` 초깃값을 그대로 쓴다 —
 * 로딩을 기다리는 `useEffect` 동기화가 없다(#128과 같은 패턴).
 *
 * ── 저장 뒤에 서버 응답으로 갈아 끼운다 ─────────────────────
 * 재조회하지 않는다. `qitemVer`는 **구성이 실제로 바뀐 저장에서만** 오르고 그 판정을 서버가
 * 하므로(`FormEntity.update`의 반환값), 화면이 다시 셀 수 없는 값이다.
 *
 * ── 접수 기간은 잠긴 입력란으로 보여 준다 ───────────────────
 * 값을 감추지 않는 것은 리더가 «언제부터 접수인가»를 알아야 문항을 언제까지 고칠 수 있는지
 * 알기 때문이다. 고칠 수 없다는 것은 `disabled`와 도움말 한 줄로 밝힌다(#528 요구 3).
 */

export function RecruitmentFormEditor({
  academicProgramId,
  initialView,
}: Readonly<{
  academicProgramId: number;
  initialView: RecruitmentFormView;
}>) {
  const [view, setView] = useState(initialView);
  const [cpst, setCpst] = useState<QitemCpstCn>(initialView.form.qitemCpstCn);
  /** 편집기가 막은 조작 한 줄 — 어드민의 `flash` 토스트 자리 */
  const [warning, setWarning] = useState("");
  /** 마지막 저장이 성공했다는 표시. 다시 고치면 지운다 */
  const [savedAt, setSavedAt] = useState("");

  const { saving, errorMessage, save } = useSaveRecruitmentForm(academicProgramId);

  const editable = view.isEditable;

  /*
   * 서버에 이미 저장된 문항 ID — **초깃값이 아니라 지금 서버가 들고 있는 것**이다. 저장에
   * 성공하면 그 응답의 구성이 새 기준이 되므로 `view`에서 읽는다(초깃값으로 두면 저장 뒤
   * «지운 문항»을 계속 지운 것으로 센다).
   */
  const savedQitemIds = useMemo(
    () => view.form.qitemCpstCn.qitems.map((q) => q.qitemId),
    [view],
  );
  const hasResponses = view.form.responseCount > 0;

  /*
   * 삭제하면 서버가 409로 막는 문항들. 응답이 없으면 빈 배열이다 — 응답이 없는 폼에서는
   * 어떤 문항이든 지울 수 있다(어드민 `use-form-editor.ts`의 `inUseQitemIds`와 같은 규칙).
   * 접수 전에만 고칠 수 있으므로 정상 흐름에서는 언제나 빈 배열이다.
   */
  const inUseQitemIds = useMemo(
    () => (hasResponses ? savedQitemIds : []),
    [hasResponses, savedQitemIds],
  );

  const issues = useMemo(
    () =>
      validateQitemCpst(cpst, {
        savedQitemIds,
        hasResponses,
        systemRequiredQitemIds: view.form.systemRequiredQitemIds,
      }),
    [cpst, savedQitemIds, hasResponses, view.form.systemRequiredQitemIds],
  );

  const onChange = (updater: (c: QitemCpstCn) => QitemCpstCn) => {
    setCpst(updater);
    setWarning("");
    setSavedAt("");
  };

  const onSave = async () => {
    setWarning("");
    const outcome = await save(cpst);
    if (outcome.result === "saved") {
      setView(outcome.view);
      // 저장 결과를 화면의 기준으로 삼는다 — 서버가 정규화한 구성이 있으면 그것이 정본이다
      setCpst(outcome.view.form.qitemCpstCn);
      setSavedAt(new Date().toTimeString().slice(0, 5));
    }
  };

  return (
    <>
      {/*
        `Notice`(`@ssccops/ui`)를 쓰지 않는다 — 그쪽은 화면 한가운데 세우는 빈 상태 카드라
        (세로 패딩 46px) 편집기 위에 띠로 놓을 자리가 아니다. 시안의 한 줄 띠를 그린다.
      */}
      {editable ? (
        <p className="rounded-[12px] border border-amber/45 bg-amber-soft px-[14px] py-[11px] text-[13.5px] leading-[1.7] text-amber">
          모집 시작 전까지만 문항을 고칠 수 있습니다.{" "}
          {view.form.rcptBgngDt
            ? `${formatDt(view.form.rcptBgngDt)}에 접수가 열리면 이 화면은 읽기 전용으로 바뀝니다.`
            : "학술국장이 접수 시작 일시를 정하면 그때까지만 고칠 수 있습니다."}
        </p>
      ) : (
        <p className="rounded-[12px] border border-line bg-bg px-[14px] py-[11px] text-[13.5px] leading-[1.7] text-n400">
          접수가 시작돼 문항을 고칠 수 없습니다. 고쳐야 하면 학술국장에게 문의해주세요.
        </p>
      )}

      <div className="grid grid-cols-1 gap-[12px] lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-[12px]">
          <Card>
            <SectionLabel>기본정보</SectionLabel>
            <div className="mt-3 flex flex-col gap-3">
              {/*
                폼 제목은 «{행사명} 모집»으로 승인 이관이 파생한 값이라 행사명이 정본이다.
                서버가 본문에서 받지 않으므로 여기서 고칠 수 없다 — 값을 감추면 «무엇을 보고
                있는지»가 사라져 잠긴 채 보여 준다.
              */}
              <Field label="폼 제목">
                <TextField value={view.form.formTtlNm} disabled readOnly />
              </Field>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <SectionLabel>모집 일정</SectionLabel>
              <div className="flex-1" />
              <span className="rounded-full bg-bg px-[10px] py-[4px] text-[12px] text-n400">
                학술국장 지정
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="접수 시작 일시">
                <TextField
                  value={view.form.rcptBgngDt ? formatDt(view.form.rcptBgngDt) : "미정"}
                  disabled
                  readOnly
                />
              </Field>
              <Field label="접수 종료 일시">
                <TextField
                  value={view.form.rcptEndDt ? formatDt(view.form.rcptEndDt) : "미정"}
                  disabled
                  readOnly
                />
              </Field>
            </div>
            <p className="mt-2 text-[13px] text-n500">
              모집 시작·종료 일자는 학술국장이 정합니다. 날짜를 바꿔야 하면 학술국장에게 요청하세요.
            </p>
          </Card>

          {editable && (
            <Card>
              {/*
                저장을 막는 사유가 있으면 버튼을 잠근다 — 보내 봐야 서버가 400·409로 거절할
                요청이고, 실패로 보여 주면 사용자는 서버 장애로 오해한다.
              */}
              <button
                type="button"
                onClick={onSave}
                disabled={saving || issues.blockingMessage !== ""}
                title={issues.blockingMessage || undefined}
                className="w-full cursor-pointer rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "저장 중" : "저장"}
              </button>

              {issues.blockingMessage && (
                <p className="mt-2 text-[13px] text-danger">{issues.blockingMessage}</p>
              )}
              {errorMessage && <p className="mt-2 text-[13px] text-danger">{errorMessage}</p>}
              {warning && <p className="mt-2 text-[13px] text-amber">{warning}</p>}
              {savedAt && !errorMessage && (
                <p className="mt-2 text-[13px] text-n500">
                  저장됐습니다 · {savedAt} · 문항 버전 v{view.form.qitemVer}
                </p>
              )}

              <p className="mt-2 text-[13px] text-n500">
                저장하면 문항 버전이 올라가고 변경 내역이 학술국장에게 표시됩니다.
              </p>
            </Card>
          )}
        </div>

        <QitemComposer
          cpst={cpst}
          onChange={onChange}
          issues={issues.qitems}
          inUseQitemIds={inUseQitemIds}
          systemRequiredQitemIds={view.form.systemRequiredQitemIds}
          readOnly={!editable}
          onWarn={setWarning}
        />
      </div>
    </>
  );
}
