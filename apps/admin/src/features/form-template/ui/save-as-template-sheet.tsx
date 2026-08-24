"use client";

import { useState } from "react";
import { TMPL_EXPLN_MAX_LENGTH, TMPL_NM_MAX_LENGTH } from "@/entities/form-template";
import { Field, Sheet, TextArea, TextField } from "@/shared/ui";

/*
 * '이 폼을 템플릿으로 저장' 시트 (#134).
 *
 * ── 복제와 다른 조작이다 ───────────────────────────────────────
 * 복제는 "이 폼과 똑같은 것 하나 더"라 접수 기간을 뺀 폼이 생기고, 이쪽은 문항 구성만 떼어
 * 다음 회차의 출발점으로 남긴다. 그래서 버튼도 따로 두고, 옮겨지지 않는 것(접수 기간·상태·
 * 라벨·응답)을 시트 안에서 미리 말한다 — 저장한 뒤에 알면 이미 다른 것을 기대한 뒤다.
 *
 * 이름을 비우면 서버가 폼 제목을 쓴다. 기본값을 입력란에 미리 채워 두지 않는 것은, 채워 두면
 * 사용자가 그 값을 지웠을 때 '이름 없는 템플릿'을 만들려는 것처럼 보이기 때문이다 —
 * 빈 칸과 폼 제목이 같은 뜻이라는 것을 placeholder가 말하게 한다.
 */

export function SaveAsTemplateSheet({
  open,
  formTtlNm,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  /** 이름을 비웠을 때 무엇이 될지 보여 주기 위한 폼 제목 */
  formTtlNm: string;
  pending: boolean;
  onClose: () => void;
  onSave: (input: { tmplNm: string; tmplExpln: string }) => void;
}) {
  const [tmplNm, setTmplNm] = useState("");
  const [tmplExpln, setTmplExpln] = useState("");

  const close = () => {
    setTmplNm("");
    setTmplExpln("");
    onClose();
  };

  /* 서버 400을 기다리지 않고 그 자리에서 걸러 준다 — 최종 판정은 여전히 서버다 */
  const nmError =
    tmplNm.trim().length > TMPL_NM_MAX_LENGTH
      ? `템플릿 이름은 ${TMPL_NM_MAX_LENGTH}자를 넘을 수 없습니다`
      : "";
  const explnError =
    tmplExpln.trim().length > TMPL_EXPLN_MAX_LENGTH
      ? `설명은 ${TMPL_EXPLN_MAX_LENGTH}자를 넘을 수 없습니다`
      : "";
  const blocked = Boolean(nmError || explnError);

  return (
    <Sheet
      open={open}
      title="템플릿으로 저장"
      hint="지금 저장돼 있는 문항 구성을 새 템플릿으로 남깁니다"
      onClose={close}
      onOk={() => {
        if (!pending && !blocked) onSave({ tmplNm, tmplExpln });
      }}
      okLabel={pending ? "저장하는 중…" : "템플릿으로 저장"}
      okDisabled={pending || blocked}
      okTitle={blocked ? nmError || explnError : undefined}
    >
      <Field label="템플릿 이름" error={nmError || null}>
        <TextField
          value={tmplNm}
          invalid={Boolean(nmError)}
          onChange={(e) => setTmplNm(e.target.value)}
          placeholder={`비워 두면 ${formTtlNm || "폼 제목"}을 씁니다`}
        />
      </Field>
      <Field label="설명" className="mt-4" error={explnError || null}>
        <TextArea
          value={tmplExpln}
          onChange={(e) => setTmplExpln(e.target.value)}
          placeholder="어떤 폼에 쓰는 구성인지 적어 두면 고를 때 도움이 됩니다 (선택)"
        />
      </Field>
      <div className="mt-3 text-[13.5px] text-n400">
        접수 기간·접수 상태·라벨·응답은 옮겨지지 않습니다. 새 템플릿은 바로 사용할 수 있습니다.
      </div>
    </Sheet>
  );
}
