"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";

/** 중앙 모달 시트 — 등급/상태/역할 변경, 반려 사유 입력 등 */
export function Sheet({
  open,
  title,
  hint,
  onClose,
  onOk,
  okLabel = "확인",
  okDisabled,
  okTitle,
  okVariant = "primary",
  cancelLabel = "취소",
  onCancel,
  children,
}: Readonly<{
  open: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  onOk?: () => void;
  okLabel?: string;
  /**
   * 확인 버튼을 잠근다 — 감추지 않고 잠근 채 이유를 `okTitle`로 붙인다 (PageHeader와 같은 판단).
   *
   * 서버가 어차피 거절할 입력(등급·상태 시트에서 현재와 같은 값 · 미래 적용 일자)을 왕복 없이
   * 그 자리에서 막는 데 쓴다. 버튼 자체를 없애면 왜 저장이 안 되는지가 화면에서 사라진다.
   */
  okDisabled?: boolean;
  okTitle?: string;
  /**
   * 확인 버튼의 색. 기본은 accent다.
   *
   * 되돌릴 수 없는 삭제(회원 하드 삭제 #411)만 `danger`를 쓴다 — 폼·행사 삭제는 되살릴 수
   * 있어 기본색으로 두었고, 이쪽은 누르는 순간까지 위험이 눈에 남아야 한다. `ghost` 계열은
   * 여기 없다 — 확인 버튼이 흐려지면 취소와 구분되지 않는다.
   */
  okVariant?: "primary" | "danger";
  /**
   * 왼쪽 버튼의 글자와 동작. 기본은 «취소 → onClose»다.
   *
   * 단계가 있는 시트(회원 일괄 변경 #382 — 입력 → 미리보기 → 결과)가 미리보기에서 «이전»,
   * 결과에서 «닫기»를 쓴다. 시트 밖(스크림)을 누르는 것은 여전히 `onClose`다 — 바깥을 누르는
   * 뜻은 "이 시트에서 나간다"이지 "한 단계 앞으로"가 아니다.
   */
  cancelLabel?: string;
  onCancel?: () => void;
  children?: ReactNode;
}>) {
  /*
   * Esc로 닫는다 (ssccops-web#403).
   *
   * 스크림(아래 배경 div)은 클릭으로 닫히지만 키보드로 «누르는» 대상이 아니다 — 화면 전체를
   * 덮는 배경에 `role="button"`·`tabIndex`를 붙이면 Tab 정거장이 하나 늘 뿐 뜻이 없다. 모달을
   * 키보드로 나가는 규약은 Esc다. 초점은 열릴 때 안으로 옮기지만(아래) 사용자가 밖을 눌러
   * 초점을 빼낼 수 있으므로 시트 컨테이너가 아니라 드로어(mobile-nav)와 같이 document에서
   * 받는다. 배경은 `aria-hidden`으로 보조기기에서 치운다.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /*
   * 초점을 안으로 옮기고, 닫히면 열었던 자리로 돌려놓는다 (UI 감사 D7 · #470).
   *
   * 그전에는 열려도 초점이 `body`에 남아 Tab이 시트 뒤의 화면을 돌았고, 보조기기는 시트가 열린
   * 것을 알 수 없었다(`role`·`aria-modal`이 없었다). 드로어(mobile-nav)와 같은 방식이다 —
   * 패널에 `tabIndex={-1}`을 주고 거기에 초점을 두면 안의 첫 입력이 무엇이든 다음 Tab이 그것으로
   * 간다. 위의 Esc 처리는 그대로 두었다 — 초점이 안에 있어도 document 리스너가 먼저 받는다.
   */
  const panelRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => opener?.focus?.();
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[90] animate-fade-in bg-scrim"
        onClick={onClose}
      />
      {/*
        폭이 w-[440px] 고정이면 375px 화면에서 좌우가 잘려 취소·확인 버튼에 닿을 수 없다 (#85).
        max-w로 바꾸고 좌우 여백을 빼 좁은 화면에서는 화면에 맞추고, 440px 이상에서는
        예전과 같은 크기를 유지한다.

        `role="dialog"`을 붙인 div가 아니라 `<dialog>`다 (#658 · S6819) — 같은 역할이 태그에
        들어 있다. **`open` 속성만 쓰고 `showModal()`은 쓰지 않는다**: 최상위 레이어로 올라가면
        스크림·z-index를 브라우저가 대신 정해, 위의 스크림과 이 시트 위에 겹쳐 뜨는 것들이
        모두 어긋난다. 여는 조건은 위의 `if (!open) return null` 그대로다.

        브라우저 기본 스타일 중 Tailwind preflight가 되돌리지 않는 둘을 여기서 맞춘다 —
        `height: fit-content`는 `h-auto`로, `color: CanvasText`는 `text-[color:inherit]`로
        (부모에서 물려받던 색을 그대로 둔다). 여백·테두리는 preflight의
        `* { margin: 0; padding: 0; border: 0 }`이 이미 지운다.
      */}
      <dialog
        ref={panelRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed top-1/2 left-1/2 z-[91] h-auto max-h-[78%] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 animate-pop-in overflow-y-auto rounded-2xl bg-surface p-[22px] text-[color:inherit] shadow-[0_0_0_1px_var(--color-line-strong),0_16px_40px_rgb(0_0_0/.56)] outline-none"
      >
        <h2 id={titleId} className="text-[20px] font-medium">
          {title}
        </h2>
        {hint && <div className="mt-[5px] mb-[18px] text-[14px] text-n500">{hint}</div>}
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel ?? onClose}>
            {cancelLabel}
          </Button>
          {onOk && (
            <Button variant={okVariant} onClick={onOk} disabled={okDisabled} title={okTitle}>
              {okLabel}
            </Button>
          )}
        </div>
      </dialog>
    </>
  );
}
