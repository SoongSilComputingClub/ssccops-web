"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn, useFocusTrap } from "@ssccops/ui";

/*
 * 중앙 모달 시트 (#742 — 이 앱의 첫 시트다: 팀원 추가 · 제외 확인).
 *
 * 모양·동작은 어드민 `shared/ui/sheet.tsx`를 따른다 — 스크림 클릭·Esc로 닫고, 초점을 안으로
 * 넣어 가두고, 닫히면 연 자리로 돌려준다. **초점 관리는 `@ssccops/ui` `useFocusTrap` 한 벌**이다
 * (ssccops#511 — 오버레이마다 따로 짜던 동안 하나씩 빠졌다). 어드민 시트를 패키지로 올리지 않은
 * 것은 그쪽이 어드민 `Button`(변형 여섯)에 묶여 있고 이 앱에는 `Button`이 없어서다 — 올리려면
 * 버튼 체계까지 옮겨야 한다. 갈리면 안 되는 부분(초점)은 이미 한 벌이다.
 *
 * **`document.body`로 포털한다**(#733 · lms 드로어와 같은 판단) — 조상에 `backdrop-filter`·
 * `transform`이 걸리면 `fixed`가 화면이 아니라 그 조상에 갇힌다. 시트는 버튼을 누른 뒤에만 열리므로
 * 서버 렌더에는 이 가지가 없다.
 *
 * `<dialog>`를 `open` 속성으로만 연다(`showModal()` 아님) — 어드민 시트와 같은 이유(스크림·z-index를
 * 직접 정한다)이고, 그래서 가두기를 `useFocusTrap`이 손으로 한다.
 */
export function Sheet({
  open,
  title,
  hint,
  onClose,
  onOk,
  okLabel = "확인",
  okDisabled,
  okTitle,
  okTone = "accent",
  children,
}: Readonly<{
  open: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  /** 없으면 확인 버튼 없이 «닫기»만 선다(고르기 목록처럼 항목을 누르는 것이 곧 동작인 시트) */
  onOk?: () => void;
  okLabel?: string;
  /** 확인을 감추지 않고 잠근다 — 이유는 `okTitle`로 */
  okDisabled?: boolean;
  okTitle?: string;
  /** 확인 버튼 색 — 명단에서 빼는 것처럼 되돌릴 수 있어도 무게가 있는 동작은 `danger` */
  okTone?: "accent" | "danger";
  children?: ReactNode;
}>) {
  // Esc로 닫는다 — 초점이 밖으로 새어도 받도록 document에서(어드민 시트 · 드로어와 같다)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const panelRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useFocusTrap(open, panelRef);

  if (!open) return null;
  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[90] animate-fade-in bg-scrim motion-reduce:animate-none"
        onClick={onClose}
      />
      {/*
        375px에서 좌우가 잘리지 않게 폭은 max-w로 잡는다(어드민 #85와 같다). 브라우저 기본 스타일 중
        preflight가 되돌리지 않는 둘(`height: fit-content` · `color: CanvasText`)을 여기서 맞춘다.
      */}
      <dialog
        ref={panelRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed top-1/2 left-1/2 z-[91] flex h-auto max-h-[80%] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-surface p-[20px] text-[color:inherit] shadow-[0_0_0_1px_var(--color-line-strong),0_16px_40px_rgb(0_0_0/.4)] outline-none"
      >
        <h2 id={titleId} className="text-[19px] font-medium">
          {title}
        </h2>
        {hint && <p className="mt-[5px] mb-[14px] text-[14px] leading-[1.6] text-n500">{hint}</p>}
        {children}
        <div className="mt-[18px] flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-line px-[16px] py-[10px] text-[15px] text-n400 transition-colors hover:border-accent hover:text-accent"
          >
            {onOk ? "취소" : "닫기"}
          </button>
          {onOk && (
            <button
              type="button"
              onClick={onOk}
              disabled={okDisabled}
              title={okTitle}
              className={cn(
                "rounded-[12px] px-[16px] py-[10px] text-[15px] font-semibold text-on-solid transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                okTone === "danger"
                  ? "bg-danger hover:bg-danger-strong"
                  : "bg-accent hover:bg-accent-strong",
              )}
            >
              {okLabel}
            </button>
          )}
        </div>
      </dialog>
    </>,
    document.body,
  );
}
