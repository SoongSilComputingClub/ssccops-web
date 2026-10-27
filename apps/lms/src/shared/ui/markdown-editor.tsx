"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { Card, Field, SectionLabel, cn } from "@ssccops/ui";
import { Markdown } from "./markdown";
import { TextArea } from "./textarea";

/*
 * 본문 Markdown 편집기 — 편집/미리보기 전환 · 이미지 첨부 · 글자 수 (#819 · ADR-0069).
 *
 * ── 어드민 `shared/ui/markdown-editor.tsx`의 앱별 사본이다 ─────────
 * 소개 글 편집(리더가 자기 프로그램의 행사 본문을 고친다)이 이 앱의 첫 쓰임이다. 앱끼리 소스를
 * 공유하지 않고, 편집기는 앱마다 둔다는 판단이 이미 있다(ADR-0052 — 문항 편집기 두 벌).
 * `packages/ui`로 올리지 않은 것은 어드민 쪽이 어드민 `Button`·`Segmented`에 묶여 있고 `markdoc`
 * 맛(콘텐츠 페이지 레이아웃 태그)까지 품고 있어서다 — 이 앱은 행사 본문(`markdown`)만 쓴다.
 * 그래서 옮기면서 `markdoc` 갈래를 빼고 버튼 둘을 이 파일 안의 맨 `button`으로 바꿨다. 어드민에서
 * 동작을 고치면 여기도 본다.
 *
 * **미리보기 렌더러는 공개 웹사이트 행사 상세와 같은 `Markdown`(`@ssccops/ui`)이다.** 미리보기
 * 전용 렌더러를 두면 «미리보기는 맞는데 실제가 다른» 상태가 생긴다.
 *
 * 상태(`bodyTab`·`value`·업로드 진행·오류)는 부르는 폼이 쥐고 여기는 그리기만 한다 — 첨부한
 * 이미지가 커서 자리에 들어가려면 textarea ref와 본문 값이 폼과 같은 것을 가리켜야 해서다.
 */

export const BODY_TABS = ["편집", "미리보기"] as const;
export type BodyTab = (typeof BODY_TABS)[number];

/** 본문 상한 — 서버 413(`EVENT_CONTENT_TOO_LARGE`)과 같은 값. 왕복 없이 먼저 알린다 */
export const MTXT_MAX_LENGTH = 100_000;

/** 파일 선택 창이 이미지만 보이게 하는 힌트 — 검증이 아니다(형식 판정은 서버에만 있다) */
const IMAGE_ACCEPT = "image/*";

/**
 * 파일 하나를 고르는 버튼. 고른 뒤 값을 비우는 것은 같은 파일을 다시 고를 수 있게 하려는 것이다
 * (비우지 않으면 실패 뒤 같은 파일로 재시도할 때 change가 오지 않는다).
 */
export function ImagePickButton({
  label,
  disabled,
  hint,
  onPick,
}: Readonly<{
  label: string;
  disabled: boolean;
  /** 잠겼을 때의 사유 */
  hint?: string;
  onPick: (file: File) => void;
}>) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={pickerRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        title={hint}
        onClick={() => pickerRef.current?.click()}
        className="cursor-pointer whitespace-nowrap rounded-[10px] border border-line-strong px-[12px] py-[6px] text-[13.5px] text-n300 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
      >
        {label}
      </button>
    </>
  );
}

/**
 * 이미지 문법을 커서 자리에 끼운 결과 — 앞뒤로 줄바꿈을 채워 문단 사이에 놓는다(문장 한가운데
 * 낀 이미지는 그 문단에 흡수된다). textarea를 잡지 못했으면 본문 끝에 붙인다.
 */
export function insertImageMarkdown(
  value: string,
  el: HTMLTextAreaElement | null,
  url: string,
): { value: string; caret: number | null } {
  const snippet = `![](${url})`;

  if (!el) {
    const next =
      value && !value.endsWith("\n") ? `${value}\n\n${snippet}\n` : `${value}${snippet}\n`;
    return { value: next, caret: null };
  }

  const start = el.selectionStart;
  const end = el.selectionEnd;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before && !before.endsWith("\n") ? "\n" : "";
  const trail = after && !after.startsWith("\n") ? "\n" : "";
  const inserted = `${lead}${snippet}${trail}`;

  return { value: `${before}${inserted}${after}`, caret: start + inserted.length };
}

/** 값이 DOM에 반영된 뒤에 커서를 옮긴다 — 지금 옮기면 다음 렌더가 되돌린다 */
export function moveCaretAfterRender(el: HTMLTextAreaElement, caret: number): void {
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}

export function MarkdownEditor({
  label,
  bodyTab,
  setBodyTab,
  value,
  onChange,
  textareaRef,
  error,
  placeholder,
  busy,
  readOnly = false,
  attach,
  className,
}: Readonly<{
  /** 칸 이름 — «본문 (Markdown)» 앞부분 */
  label: ReactNode;
  bodyTab: BodyTab;
  setBodyTab: (tab: BodyTab) => void;
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** 본문 칸의 검증 오류 — 미리보기에서도 보여야 한다 */
  error: string | undefined;
  placeholder?: string;
  /** 저장 요청이 진행 중 — 첨부 버튼을 잠근다 */
  busy: boolean;
  /** 잠긴 화면 — 편집칸을 읽기 전용으로 두고 첨부 버튼을 그리지 않는다(어드민 사본에 없는 갈래) */
  readOnly?: boolean;
  /** 이미지 첨부 — 없으면 첨부 버튼과 안내를 그리지 않는다 */
  attach?: {
    uploading: boolean;
    /** 업로드 실패 한 줄 — 토스트가 아니라 이 자리에 남긴다 */
    error: string | null;
    onPick: (file: File) => void;
  };
  className?: string;
}>) {
  const showAttach = attach && !readOnly;

  return (
    <Card className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SectionLabel>{label} (Markdown)</SectionLabel>
        {/*
          어드민 `Segmented`와 같은 판단 — `role="tab"` 배선이 없으므로 `aria-pressed`로 켜진 쪽을
          알린다.
        */}
        <div
          role="group"
          aria-label="본문 보기 방식"
          className="inline-flex rounded-[10px] border border-line p-[2px]"
        >
          {BODY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={bodyTab === tab}
              onClick={() => setBodyTab(tab)}
              className={cn(
                "cursor-pointer rounded-[8px] px-[12px] py-[4px] text-[13.5px]",
                bodyTab === tab ? "bg-accent-soft font-semibold text-accent" : "text-n400 hover:text-ink",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {/* 미리보기 중에는 첨부 버튼을 감춘다 — 넣을 커서 자리가 없다 */}
        {showAttach && bodyTab === "편집" && (
          <ImagePickButton
            label={attach.uploading ? "올리는 중…" : "이미지 첨부"}
            disabled={busy || attach.uploading}
            onPick={attach.onPick}
          />
        )}
      </div>
      {/* 편집칸을 언마운트하지 않고 접는다 — 돌아왔을 때 커서 자리와 ref가 남는다 */}
      <div hidden={bodyTab !== "편집"}>
        <Field label={null} error={error}>
          <TextArea
            ref={textareaRef}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[260px] font-mono text-[16px] leading-[1.8] lg:text-[13.5px]"
            placeholder={placeholder}
          />
        </Field>
      </div>
      {bodyTab === "미리보기" && (
        <div className="min-h-[260px] rounded-[12px] border border-line bg-bg px-[16px] py-[6px]">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <div className="py-[110px] text-center text-[13.5px] text-n500">
              아직 본문이 없습니다.
            </div>
          )}
        </div>
      )}
      {bodyTab === "미리보기" && error && (
        <div className="mt-2 text-[12.5px] text-danger">{error}</div>
      )}
      {showAttach && attach.error && (
        <div className="mt-2 text-[12.5px] text-danger">{attach.error}</div>
      )}
      <div className="mt-2 text-[12.5px] text-n500">
        {value.length.toLocaleString()} / {MTXT_MAX_LENGTH.toLocaleString()}자
        {showAttach && bodyTab === "편집" && " · 이미지를 첨부하면 커서 자리에 이미지 문법이 들어갑니다"}
      </div>
    </Card>
  );
}
