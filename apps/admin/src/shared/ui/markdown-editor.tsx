"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { Button } from "./button";
import { Card, SectionLabel } from "./card";
import { Field, TextArea } from "./field";
import { Markdown } from "./markdown";
import { Segmented } from "./segmented";

/*
 * 본문 Markdown 편집기 — 편집/미리보기 전환 · 이미지 첨부 · 글자 수 (ssccops#274 · #521).
 *
 * 행사 본문(features/event/ui/event-form.tsx)에 있던 것을 그대로 올렸다 — 콘텐츠 페이지·
 * 포스트(#521)가 같은 편집기를 쓰게 되면서 두 feature가 한 벌을 나눠 써야 하는데, features
 * 슬라이스끼리는 참조하지 않으므로(FSD) shared로 올린 것이다. 사본을 두면 «미리보기는 맞는데
 * 실제가 다른» 상태가 두 곳에서 따로 생긴다.
 *
 * 상태(`bodyTab`·`value`·업로드 진행·오류)는 부르는 폼이 쥐고 여기는 그리기만 한다 — 첨부한
 * 이미지가 커서 자리에 들어가려면 textarea ref와 본문 값이 폼의 `insertImageMarkdown`과 같은
 * 것을 가리켜야 해서다.
 *
 * **미리보기가 답하는 것은 "무엇이 어떻게 그려지는가"이지 "어디서 줄이 바뀌는가"가 아니다.**
 * 어드민 폼과 공개 상세는 본문 칸의 폭이 달라 줄바꿈 자리가 같을 수 없다.
 */

export const BODY_TABS = ["편집", "미리보기"] as const;
export type BodyTab = (typeof BODY_TABS)[number];

/** 본문 상한 — 서버 413(EVENT_CONTENT_TOO_LARGE · CONTENT_TOO_LARGE)과 같은 값. 왕복 없이 먼저 알린다 */
export const MTXT_MAX_LENGTH = 100_000;

/*
 * 파일 선택 창이 이미지만 보이게 하는 힌트다 — **검증이 아니다.**
 *
 * 허용 형식의 판정은 서버에만 있다(ssccops-server#161). 웹이 목록을 복제하면 서버가 형식을
 * 늘린 날에도 화면만 계속 막고, 사용자는 왜 막혔는지 알 길이 없다. 여기 값은 고를 때의
 * 편의일 뿐이고 최종 판정은 업로드 응답 코드로 안내한다.
 */
const IMAGE_ACCEPT = "image/*";

/**
 * 파일 하나를 고르는 버튼.
 *
 * `input[type=file]`을 그대로 두지 않고 감춰 버튼으로 감싼 것은, 브라우저 기본 파일 입력이
 * 폼의 다른 입력란과 생김새·크기가 전혀 달라 좁은 화면에서 줄을 깨기 때문이다. 고른 뒤
 * 값을 비우는 것(`e.target.value = ""`)은 **같은 파일을 다시 고를 수 있게** 하기 위함이다 —
 * 비우지 않으면 업로드가 실패한 뒤 같은 파일로 재시도할 때 change 이벤트가 오지 않는다.
 */
export function ImagePickButton({
  label,
  disabled,
  hint,
  onPick,
}: Readonly<{
  label: string;
  disabled: boolean;
  /** 잠겼을 때의 사유 — 버튼을 감추지 않고 이유를 붙인다(AGENTS.md) */
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
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        title={hint}
        onClick={() => pickerRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

/**
 * 이미지 문법을 본문에 끼워 넣은 결과 — 새 본문과 커서가 갈 자리.
 *
 * 커서 위치에 넣는 것은, 긴 본문을 쓰다가 중간에 그림을 끼우는 것이 실제 작성 순서이기
 * 때문이다(끝에만 붙이면 사용자가 매번 잘라내 옮겨야 한다). 앞뒤로 줄바꿈을 채워 문단
 * 사이에 놓는 것은 Markdown에서 문장 한가운데 낀 이미지가 그 문단에 흡수되기 때문이다.
 *
 * textarea를 잡지 못했을 때만 본문 끝에 붙인다(`caret`은 null) — 넣을 자리를 모르는 것이지
 * 넣지 못하는 것은 아니므로, 올려 둔 파일을 버리지 않는다.
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

/**
 * 값이 DOM에 반영된 뒤에 커서를 옮긴다 — 지금 옮기면 다음 렌더가 되돌린다. 그림을 넣은
 * 자리에서 글을 이어 쓰는 것이 자연스러운 다음 동작이라 포커스도 함께 돌려준다.
 */
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
  attach,
  footnote,
  className,
}: Readonly<{
  /** 칸 이름 — «본문 (Markdown)» 앞부분. 사전(FIELD_LABEL)에서 꺼낸 값을 준다 */
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
  /**
   * 이미지 첨부 — 없으면(undefined) 첨부 버튼과 안내를 그리지 않는다.
   *
   * 페이지 본문처럼 이미지 발급 경로가 없는 자리가 있다(#521 — 갤러리는 포스트에만 있다).
   * 버튼을 잠근 채 두면 «왜 잠겼나»가 권한 문제로 읽히므로, 그 자리는 아예 그리지 않는다.
   */
  attach?: {
    uploading: boolean;
    /** 첨부를 잠글 사유 — 없으면 undefined(잠기지 않았다) */
    lock: string | undefined;
    /** 업로드 실패 한 줄 — 토스트가 아니라 이 자리에 남긴다 */
    error: string | null;
    onPick: (file: File) => void;
  };
  /** 글자 수 뒤에 붙는 한 줄 — 없으면 첨부 안내(attach가 있을 때)만 */
  footnote?: string;
  className?: string;
}>) {
  const attachNote = attach
    ? attach.lock
      ? ` — ${attach.lock}`
      : " — 이미지를 첨부하면 커서 자리에 이미지 문법이 들어갑니다"
    : "";

  return (
    <Card className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SectionLabel>{label} (Markdown)</SectionLabel>
        <Segmented
          options={BODY_TABS}
          value={bodyTab}
          onChange={setBodyTab}
          className="w-[168px]"
        />
        <div className="flex-1" />
        {/*
          미리보기 중에는 첨부 버튼을 감춘다 — 넣을 커서 자리가 없다. 잠그지 않고 감추는
          것은 사유가 권한이 아니라 지금 보는 화면이라서다. 잠근 버튼에 붙일 이유가
          "편집으로 돌아가세요" 하나뿐이면 그 버튼은 그 자리에 없는 편이 낫다.
        */}
        {attach && bodyTab === "편집" && (
          <ImagePickButton
            label={attach.uploading ? "올리는 중…" : "이미지 첨부"}
            disabled={busy || attach.uploading || Boolean(attach.lock)}
            hint={attach.lock}
            onPick={attach.onPick}
          />
        )}
      </div>
      {/*
        편집칸을 언마운트하지 않고 hidden으로 접는다. 지우면 돌아왔을 때 커서 자리와
        스크롤이 사라지고, insertImageMarkdown이 잡아 둔 ref도 끊긴다.
      */}
      <div hidden={bodyTab !== "편집"}>
        <Field label={null} error={error}>
          <TextArea
            ref={textareaRef}
            value={value}
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
      {/* 오류는 미리보기에서도 보여야 한다 — 상한을 넘긴 채 넘어올 수 있다 */}
      {bodyTab === "미리보기" && error && (
        <div className="mt-2 text-[12.5px] text-danger">{error}</div>
      )}
      {/*
        업로드 실패는 토스트가 아니라 이 자리에 남긴다 — 무엇이 왜 막혔는지 다시 볼 수
        있어야 하고, 사라지는 알림이면 파일을 다시 고르는 사이에 문구가 없어진다.
      */}
      {attach?.error && <div className="mt-2 text-[12.5px] text-danger">{attach.error}</div>}
      {/* 글자 수는 두 화면 모두에서 뜻이 있다. 첨부 안내는 편집에만 있다 */}
      <div className="mt-2 text-[12.5px] text-n500">
        {value.length.toLocaleString()} / {MTXT_MAX_LENGTH.toLocaleString()}자
        {bodyTab === "편집" && attachNote}
        {footnote && ` — ${footnote}`}
      </div>
    </Card>
  );
}
