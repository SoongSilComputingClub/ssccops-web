"use client";

import { cn } from "../lib/cn";
import { isChoiceQitemType } from "../model/qitem-type";
import { selectedOptions, toggleOption } from "../model/answers";
import type { AnswerValue, Qitem } from "../model/types";

/*
 * 문항 한 칸 — 유형별 렌더링.
 *
 * 값의 모양은 **저장 계약 그대로**다 — 다중선택만 배열이고 나머지는 문자열이다. 예전에는
 * 단일선택도 `[option]`으로 들고 있다가 서버가 벗겨 굳혔는데, 그러면 자동 저장이 복원해 온 값
 * (문자열)과 화면이 만든 값(배열)의 모양이 달라 같은 답인데도 저장이 한 번 더 나간다.
 *
 * **자기 상태를 갖지 않는다.** 값·오류를 받아 그리고 바뀐 값을 올려보낼 뿐이라, 자동 저장과
 * 제출을 어떻게 하는지는 이 컴포넌트가 모른다 — 그 부분이 앱마다 다르기 때문이다(어드민의
 * `apiFetch`는 401에 리다이렉트를 걸지만 공개 앱은 걸지 않는다).
 *
 * 색은 두 앱이 같은 값으로 정의해 둔 디자인 토큰(`--color-surface` 등)을 쓴다. 클래스 이름을
 * Tailwind가 실제로 만들어 내려면 앱의 `globals.css`가 이 패키지 소스를 `@source`로 가리켜야
 * 한다 — 패키지는 `node_modules` 안(심링크)이라 자동 탐색에 걸리지 않는다.
 *
 * 입력란 글자를 좁은 화면에서 16px 아래로 내리지 않는다(#105) — iOS Safari가 포커스에서
 * 화면을 자동 확대하고 그 확대가 스스로 돌아오지 않는다.
 */
export function QitemCard({
  qitem,
  value,
  error,
  onChange,
}: {
  qitem: Qitem;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue) => void;
}) {
  const selected = selectedOptions(value);
  const text = typeof value === "string" ? value : "";

  return (
    <div
      className={cn(
        "rounded-2xl bg-surface px-[18px] py-4",
        error ? "shadow-[0_0_0_1px_#f04452]" : "shadow-[0_0_0_1px_#e5e8eb]",
      )}
    >
      <div className="text-[16px] font-semibold">
        {qitem.qitemLblNm}
        {qitem.reqYn && <span className="ml-1 text-danger">*</span>}
      </div>
      {isChoiceQitemType(qitem.qitemTypeCd) && (
        <div className="mt-[2px] text-[12.5px] text-n500">
          {qitem.qitemTypeCd === "SINGLE_CHOICE"
            ? "하나만 선택"
            : `여러 개 선택 가능${qitem.maxSlctCnt ? ` · 최대 ${qitem.maxSlctCnt}개` : ""}`}
        </div>
      )}
      {qitem.ptrnCn && (
        <div className="mt-[2px] text-[12.5px] text-n500">형식 · {qitem.ptrnNm}</div>
      )}

      {qitem.qitemTypeCd === "LONG_TEXT" ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="자유롭게 작성해주세요"
          className="mt-3 min-h-[104px] w-full resize-y rounded-[12px] border border-line px-[11px] py-[9px] text-[16px] outline-none placeholder:text-n500 focus:border-accent lg:text-[15.5px]"
        />
      ) : qitem.qitemTypeCd === "SHORT_TEXT" || qitem.qitemTypeCd === "DATE" ? (
        <input
          type={qitem.qitemTypeCd === "DATE" ? "date" : "text"}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="mt-3 w-full rounded-[12px] border border-line px-[11px] py-[9px] text-[16px] outline-none placeholder:text-n500 focus:border-accent lg:text-[15.5px]"
        />
      ) : (
        <div className="mt-3 flex flex-col gap-1">
          {qitem.optionList.map((o) => {
            const picked = selected.includes(o);
            return (
              <div
                key={o}
                onClick={() => onChange(toggleOption(qitem, value, o))}
                className={cn(
                  "flex cursor-pointer items-center gap-[10px] rounded-[12px] px-[10px] py-[13px] text-[15px] lg:py-[11px]",
                  picked ? "bg-accent/8" : "hover:bg-black/2",
                )}
              >
                <div
                  className={cn(
                    "size-[18px] flex-none border",
                    qitem.qitemTypeCd === "SINGLE_CHOICE" ? "rounded-full" : "rounded-[5px]",
                    picked ? "border-accent bg-accent" : "border-line-strong",
                  )}
                />
                <span className="min-w-0 break-words">{o}</span>
              </div>
            );
          })}
        </div>
      )}
      {error && <div className="mt-2 text-[13.5px] text-danger">{error}</div>}
    </div>
  );
}
