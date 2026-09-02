"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Field, TextField } from "@/shared/ui";
import { Sheet } from "@/shared/ui";
import { useFormTemplateOptions } from "../model/use-form-template-options";

/*
 * '템플릿에서 시작' — 새 폼을 만들 때 어떤 템플릿에서 출발할지 고르는 시트 (#134).
 *
 * **선택지에는 켜진 템플릿만 싣는다.** 거르는 것은 서버이고(useFormTemplateOptions), 그래서
 * 관리 목록에 취소선으로 남아 있던 템플릿은 여기 나타나지 않는다 — 목록에 있던 것을 골랐을
 * 뿐인데 400이 돌아오면 사용자는 이유를 알 수 없기 때문이다(기존 결정).
 *
 * 폼 제목을 여기서 받는 것은 복제와 갈리는 지점이다. 템플릿 이름은 "2026 신규모집 표준 문항"
 * 처럼 폼 제목으로 쓰기에 부적절한 경우가 정상이라, 만든 뒤 다시 고치게 하면 그 두 번째 저장이
 * 실패했을 때 의도하지 않은 이름의 폼이 남는다. 비워 두면 서버가 템플릿 이름을 그대로 쓴다.
 */

export function TemplateStartSheet({
  open,
  pending,
  onClose,
  onStart,
}: {
  open: boolean;
  /** 폼을 만드는 중 — 확인 버튼 문구가 바뀐다 */
  pending: boolean;
  onClose: () => void;
  /** 고른 템플릿으로 폼을 만든다. 제목이 비어 있으면 서버가 템플릿 이름을 쓴다 */
  onStart: (formTmplId: number, formTtlNm: string) => void;
}) {
  const options = useFormTemplateOptions();
  const [picked, setPicked] = useState<number | null>(null);
  const [formTtlNm, setFormTtlNm] = useState("");

  const close = () => {
    setPicked(null);
    setFormTtlNm("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      title="템플릿에서 시작"
      hint="템플릿의 문항 구성을 복사해 작성 중 폼을 만듭니다"
      onClose={close}
      onOk={() => {
        if (picked !== null && !pending) onStart(picked, formTtlNm);
      }}
      okLabel={pending ? "만드는 중…" : "폼 만들기"}
      okDisabled={picked === null || pending}
      okTitle={picked === null ? "템플릿을 먼저 선택해주세요" : undefined}
    >
      {options.loading ? (
        <div className="text-[14px] text-n500">템플릿을 불러오는 중…</div>
      ) : options.errorMessage ? (
        <div className="text-[14px] text-danger">{options.errorMessage}</div>
      ) : options.templates.length === 0 ? (
        <div className="text-[14px] text-n500">
          사용할 수 있는 템플릿이 없습니다. 템플릿 관리에서 먼저 만들어주세요.
        </div>
      ) : (
        <>
          <div className="flex max-h-[240px] flex-col gap-2 overflow-y-auto">
            {options.templates.map((t) => (
              <button
                key={t.formTmplId}
                type="button"
                onClick={() => setPicked(t.formTmplId)}
                className={cn(
                  "cursor-pointer rounded-[12px] border p-3 text-left",
                  picked === t.formTmplId
                    ? "border-accent bg-accent/5"
                    : "border-line hover:border-accent",
                )}
              >
                <div className="text-[15px] font-medium break-words">{t.tmplNm}</div>
                <div className="mt-[2px] text-[13px] text-n500">문항 {t.qitemCnt}개</div>
                {t.tmplExpln && (
                  <div className="mt-[4px] text-[13px] break-words text-n400">
                    {t.tmplExpln}
                  </div>
                )}
              </button>
            ))}
          </div>
          <Field label="폼 제목" className="mt-4">
            <TextField
              value={formTtlNm}
              onChange={(e) => setFormTtlNm(e.target.value)}
              placeholder="비워 두면 템플릿 이름을 씁니다"
            />
          </Field>
        </>
      )}
    </Sheet>
  );
}
