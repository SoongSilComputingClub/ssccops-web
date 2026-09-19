"use client";

import { useRef, useState } from "react";
import type { ContentPage, ContentPageSaveInput } from "@/entities/content";
import { FIELD_LABEL } from "@/shared/config/labels";
import {
  Button,
  Card,
  Field,
  MTXT_MAX_LENGTH,
  MarkdownEditor,
  SectionLabel,
  TextField,
  markdocErrors,
  type BodyTab,
} from "@/shared/ui";
import { NO_CONTENT_MANAGE } from "../model/content-error";

/*
 * 페이지 입력 폼 (#521) — 등록(views/content-page-new)과 수정(views/content-page-edit)이 함께 쓴다.
 * 재사용해도 되는 근거는 행사 폼과 같다 — 생성과 수정이 **같은 본문**(ContentPageSaveRequest)을
 * 쓰는 한 종류라, 갈리는 것은 제출 대상(POST/PATCH)과 저장 후 이동뿐이다.
 *
 * 게시 상태 입력란이 없다 — 저장 본문에 없고 전이 버튼(ContentPublishCard)이 따로 있다.
 * 수정 화면은 상세가 ready가 된 뒤에야 이 폼을 마운트한다(useState 초깃값 = 폼 초깃값).
 */

/** slug 규칙 — 서버 ContentSlug와 같은 값. 왕복 없이 먼저 알린다(최종 판정은 서버 400) */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 80;
export const TTL_MAX_LENGTH = 200;

export const SLUG_HINT = "소문자·숫자·하이픈만, 80자 이하";
export const SLUG_ERROR = "주소(slug)는 소문자·숫자·하이픈만, 80자 이하로 입력하세요";

/** slug 검증 — 페이지·포스트 폼이 함께 쓴다. 통과하면 undefined */
export function slugError(slug: string): string | undefined {
  const value = slug.trim();
  if (!value) return "주소(slug)를 입력하세요";
  if (value.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(value)) return SLUG_ERROR;
  return undefined;
}

/** 제목 검증 — 페이지·포스트 폼이 함께 쓴다 */
export function titleError(ttl: string): string | undefined {
  const value = ttl.trim();
  if (!value) return "제목을 입력하세요";
  if (value.length > TTL_MAX_LENGTH) return `제목은 ${TTL_MAX_LENGTH}자 이하로 입력하세요`;
  return undefined;
}

/** 본문 검증 — 페이지·포스트 폼이 함께 쓴다. 태그 오류(ADR-0039)는 첫 줄만 — 나머지는 미리보기에 */
export function bodyError(mtxt: string): string | undefined {
  if (!mtxt.trim()) return "본문을 입력하세요";
  if (mtxt.length > MTXT_MAX_LENGTH) {
    return `본문이 ${MTXT_MAX_LENGTH.toLocaleString()}자를 넘습니다 — 내용을 줄여주세요`;
  }
  const [first, ...rest] = markdocErrors(mtxt);
  if (first) return rest.length > 0 ? `${first} (외 ${rest.length}건 — 미리보기에서 확인)` : first;
  return undefined;
}

type PageFormField = "ttl" | "mtxt";

export function ContentPageForm({
  initial,
  slug,
  path,
  defaultTitle,
  busy,
  canManage,
  submitLabel,
  onSubmit,
}: Readonly<{
  /** 수정이면 현재 값 전부(전체 교체 폼) · 등록이면 null */
  initial: ContentPage | null;
  /**
   * 이 페이지의 자리 — 카탈로그(`@ssccops/content`)가 정한 슬러그 (#534). 입력란이 아니라 표시다:
   * 슬러그를 바꾸면 페이지가 라우트에서 떨어져 나가므로 어드민에서는 바꿀 수 없다.
   */
  slug: string;
  /** 공개 경로 — 슬러그 옆에 보여 준다 */
  path: string;
  /** 등록일 때 제목 초깃값 — 카탈로그의 이름 */
  defaultTitle?: string;
  busy: boolean;
  canManage: boolean;
  submitLabel: string;
  onSubmit: (input: ContentPageSaveInput) => void;
}>) {
  const [ttl, setTtl] = useState(initial?.ttl ?? defaultTitle ?? "");
  const [mtxt, setMtxt] = useState(initial?.mtxt ?? "");
  const [bodyTab, setBodyTab] = useState<BodyTab>("편집");
  const [errors, setErrors] = useState<Partial<Record<PageFormField, string>>>({});
  const mtxtRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const next: Partial<Record<PageFormField, string>> = {};
    const ttlMsg = titleError(ttl);
    const mtxtMsg = bodyError(mtxt);
    if (ttlMsg) next.ttl = ttlMsg;
    if (mtxtMsg) next.mtxt = mtxtMsg;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({ slug, ttl: ttl.trim(), mtxt });
  };

  return (
    <>
      <Card>
        <SectionLabel className="mb-3">기본 정보</SectionLabel>
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[1fr_1.4fr]">
          <Field label={FIELD_LABEL.contentSlug}>
            <div className="flex h-[44px] items-center rounded-[10px] bg-fill px-3 font-mono text-[14px] text-n300">
              {slug}
            </div>
            <div className="mt-[5px] text-[12.5px] text-n500">공개 주소 {path} · 자리는 코드가 정합니다</div>
          </Field>
          <Field label={FIELD_LABEL.contentTitle} required error={errors.ttl}>
            <TextField
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              invalid={Boolean(errors.ttl)}
            />
          </Field>
        </div>
      </Card>

      <MarkdownEditor
        className="mt-4"
        label={FIELD_LABEL.contentBody}
        bodyTab={bodyTab}
        setBodyTab={setBodyTab}
        value={mtxt}
        onChange={setMtxt}
        textareaRef={mtxtRef}
        error={errors.mtxt}
        flavor="markdoc"
        placeholder={"# 제목\n\nMarkdown으로 작성합니다. 공개 화면에 보이는 본문입니다."}
        busy={busy}
      />

      <div className="mt-5">
        <Button
          className="px-[26px] py-[11px]"
          onClick={submit}
          disabled={busy || !canManage}
          title={canManage ? undefined : NO_CONTENT_MANAGE}
        >
          {busy ? "저장하는 중…" : submitLabel}
        </Button>
        {!canManage && <div className="mt-2 text-[13.5px] text-n500">{NO_CONTENT_MANAGE}</div>}
      </div>
    </>
  );
}
