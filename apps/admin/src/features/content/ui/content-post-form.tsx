"use client";

import { useMemo, useRef, useState } from "react";
import type { ContentGalleryImage, ContentPost, ContentPostSaveInput } from "@/entities/content";
import type { EventSummary } from "@/entities/event";
import { CNTNT_CLSF_CDS, CNTNT_CLSF_NM, type CntntClsfCd } from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { formatYmd } from "@/shared/lib/date";
import {
  Button,
  Card,
  Field,
  MarkdownEditor,
  SectionLabel,
  SelectField,
  TextArea,
  TextField,
  insertImageMarkdown,
  moveCaretAfterRender,
  type BodyTab,
} from "@/shared/ui";
import { NO_CONTENT_MANAGE } from "../model/content-error";
import { useContentImageDelete, useContentImageUpload } from "../model/use-content-actions";
import { useEventLinkOptions } from "../model/use-event-link-options";
import { ContentGallery, NEED_SAVED_POST } from "./content-gallery";
import { SLUG_HINT, bodyError, slugError, titleError } from "./content-page-form";

/*
 * 포스트 입력 폼 (#521) — 등록(views/content-post-new)과 수정(views/content-post-edit)이 함께 쓴다.
 * 페이지 폼에 분류·활동일·요약·행사 연결·갤러리·표지가 더 있다.
 *
 * ── 갤러리는 폼 안의 상태다 ──────────────────────────────────
 * 올리기·지우기는 서버에 곧바로 반영되는데(발급 = 갤러리에 한 장), 그때마다 상세를 다시 부르면
 * 폼이 다시 마운트되어 **쓰던 본문이 사라진다.** 그래서 갤러리와 표지는 응답으로 부분 갱신한다 —
 * 올리면 `{fileId, imageUrl}`을 덧붙이고, 지우면 그 장을 빼고 표지였으면 표지도 비운다(서버가 같은
 * 규칙으로 비우므로 어긋나지 않는다). AGENTS의 «부분 갱신과 재조회를 가른다»에서 이쪽은 «응답이
 * 바뀐 값을 그대로 주는» 경우다.
 *
 * 표지(`coverFileId`)는 갤러리에서 고르지만 **저장 본문에 실려 PATCH로 반영된다** — 고른 즉시
 * 서버에 가지 않는다. 안내 문구가 그것을 말한다.
 */

export const SMRY_MAX_LENGTH = 300;

type PostFormField = "slug" | "cntntClsfCd" | "ttl" | "actvYmd" | "smry" | "mtxt";

/** 행사 선택지 한 줄 — 제목 뒤에 시작일을 붙여 같은 제목의 행사(연례 행사)를 가른다 */
function eventOptionLabel(event: EventSummary): string {
  return event.eventBgngDt ? `${event.eventTtl} (${formatYmd(event.eventBgngDt)})` : event.eventTtl;
}

export function ContentPostForm({
  initial,
  postId,
  busy,
  canManage,
  submitLabel,
  onSubmit,
}: Readonly<{
  /** 수정이면 현재 값 전부(전체 교체 폼) · 등록이면 null */
  initial: ContentPost | null;
  /** 갤러리 발급 경로가 걸리는 포스트. **등록 화면은 null** — 저장 뒤에야 올릴 수 있다 */
  postId: number | null;
  busy: boolean;
  canManage: boolean;
  submitLabel: string;
  onSubmit: (input: ContentPostSaveInput) => void;
}>) {
  const { events, errorMessage: eventError } = useEventLinkOptions();
  const imageUpload = useContentImageUpload();
  const imageDelete = useContentImageDelete();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [cntntClsfCd, setCntntClsfCd] = useState<CntntClsfCd | "">(initial?.cntntClsfCd ?? "");
  const [ttl, setTtl] = useState(initial?.ttl ?? "");
  const [actvYmd, setActvYmd] = useState(initial?.actvYmd ?? "");
  const [smry, setSmry] = useState(initial?.smry ?? "");
  const [mtxt, setMtxt] = useState(initial?.mtxt ?? "");
  const [eventId, setEventId] = useState(initial?.eventId != null ? String(initial.eventId) : "");
  const [eventKeyword, setEventKeyword] = useState("");
  const [gallery, setGallery] = useState<ContentGalleryImage[]>(initial?.gallery ?? []);
  const [coverFileId, setCoverFileId] = useState<number | null>(initial?.coverFileId ?? null);

  const [bodyTab, setBodyTab] = useState<BodyTab>("편집");
  const [errors, setErrors] = useState<Partial<Record<PostFormField, string>>>({});
  /* 실패 문구는 누른 자리(본문 첨부 · 갤러리)에 남긴다 — 다른 카드에 뜨면 못 본다 */
  const [galleryError, setGalleryError] = useState<{ at: "body" | "gallery"; message: string } | null>(
    null,
  );
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
  const mtxtRef = useRef<HTMLTextAreaElement>(null);

  /** 갤러리를 잠글 사유 — 없으면 undefined */
  const galleryLock = !canManage ? NO_CONTENT_MANAGE : postId == null ? NEED_SAVED_POST : undefined;

  /* 제목으로 거른 후보. 지금 연결된 행사는 후보에서 빠져도(지워짐·조회 실패) 한 줄 보탠다 */
  const eventOptions = useMemo(() => {
    const keyword = eventKeyword.trim().toLowerCase();
    return keyword
      ? events.filter((e) => e.eventTtl.toLowerCase().includes(keyword))
      : events;
  }, [events, eventKeyword]);
  const linkedEventMissing =
    initial?.eventId != null && !events.some((e) => e.eventId === initial.eventId);

  const placeImageInBody = (url: string) => {
    const el = mtxtRef.current;
    const { value, caret } = insertImageMarkdown(mtxt, el, url);
    setMtxt(value);
    setBodyTab("편집");
    if (el && caret !== null) moveCaretAfterRender(el, caret);
  };

  const runUpload = async (file: File, at: "body" | "gallery") => {
    if (postId == null) return;
    setGalleryError(null);
    const { fileId, imageUrl, message } = await imageUpload.upload(postId, file);
    if (fileId == null || imageUrl == null) {
      if (message) setGalleryError({ at, message });
      return;
    }
    setGallery((prev) => [...prev, { fileId, imageUrl }]);
    if (at === "body") placeImageInBody(imageUrl);
  };

  const runDelete = async (fileId: number) => {
    if (postId == null) return;
    setGalleryError(null);
    setDeletingFileId(fileId);
    const { value, message } = await imageDelete.remove(postId, fileId);
    setDeletingFileId(null);
    if (value === null) {
      if (message) setGalleryError({ at: "gallery", message });
      return;
    }
    setGallery((prev) => prev.filter((g) => g.fileId !== fileId));
    // 서버도 같은 규칙으로 비운다 — 표지였던 장이 사라지면 표지 없음이다
    setCoverFileId((prev) => (prev === fileId ? null : prev));
  };

  const submit = () => {
    const next: Partial<Record<PostFormField, string>> = {};
    const slugMsg = slugError(slug);
    const ttlMsg = titleError(ttl);
    const mtxtMsg = bodyError(mtxt);
    if (slugMsg) next.slug = slugMsg;
    if (!cntntClsfCd) next.cntntClsfCd = "분류를 선택하세요";
    if (ttlMsg) next.ttl = ttlMsg;
    if (!actvYmd) next.actvYmd = "활동일을 입력하세요";
    if (smry.trim().length > SMRY_MAX_LENGTH) {
      next.smry = `요약은 ${SMRY_MAX_LENGTH}자 이하로 입력하세요`;
    }
    if (mtxtMsg) next.mtxt = mtxtMsg;

    setErrors(next);
    if (Object.keys(next).length > 0 || !cntntClsfCd) return;

    onSubmit({
      slug: slug.trim(),
      cntntClsfCd,
      ttl: ttl.trim(),
      smry: smry.trim() || null,
      mtxt,
      actvYmd,
      eventId: eventId ? Number(eventId) : null,
      coverFileId,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <SectionLabel className="mb-3">기본 정보</SectionLabel>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <Field
              label={FIELD_LABEL.contentTitle}
              required
              error={errors.ttl}
              className="col-span-1 lg:col-span-2"
            >
              <TextField
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                invalid={Boolean(errors.ttl)}
              />
            </Field>
            <Field label={FIELD_LABEL.contentSlug} required error={errors.slug}>
              <TextField
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                invalid={Boolean(errors.slug)}
                placeholder="예: 2026-spring-mt"
                autoCapitalize="none"
                spellCheck={false}
              />
              <div className="mt-[5px] text-[12.5px] text-n500">{SLUG_HINT}</div>
            </Field>
            <Field label={FIELD_LABEL.contentCategory} required error={errors.cntntClsfCd}>
              <SelectField
                value={cntntClsfCd}
                onChange={(e) => setCntntClsfCd(e.target.value as CntntClsfCd | "")}
                aria-invalid={Boolean(errors.cntntClsfCd) || undefined}
              >
                <option value="">분류 선택</option>
                {CNTNT_CLSF_CDS.map((cd) => (
                  <option key={cd} value={cd}>
                    {CNTNT_CLSF_NM[cd]}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label={FIELD_LABEL.contentActivityDate} required error={errors.actvYmd}>
              <TextField
                type="date"
                value={actvYmd}
                onChange={(e) => setActvYmd(e.target.value)}
                invalid={Boolean(errors.actvYmd)}
              />
              <div className="mt-[5px] text-[12.5px] text-n500">
                공개 목록은 활동일 최신순입니다.
              </div>
            </Field>
            <Field
              label={FIELD_LABEL.contentSummary}
              error={errors.smry}
              className="col-span-1 lg:col-span-2"
            >
              <TextArea
                value={smry}
                onChange={(e) => setSmry(e.target.value)}
                className="min-h-[72px]"
                placeholder="공개 목록 카드에 보이는 한두 문장 · 비워도 됩니다"
              />
              <div className="mt-[5px] text-[12.5px] text-n500">
                {smry.trim().length} / {SMRY_MAX_LENGTH}자
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel className="mb-3">{FIELD_LABEL.contentLinkedEvent}</SectionLabel>
          <div className="grid grid-cols-1 gap-[14px]">
            <Field label="행사 찾기">
              <TextField
                value={eventKeyword}
                onChange={(e) => setEventKeyword(e.target.value)}
                placeholder="행사 제목으로 거릅니다"
              />
            </Field>
            <Field label={FIELD_LABEL.contentLinkedEvent}>
              <SelectField value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">연결 안 함</option>
                {linkedEventMissing && initial?.eventId != null && (
                  <option value={String(initial.eventId)}>연결된 행사 #{initial.eventId}</option>
                )}
                {eventOptions.map((event) => (
                  <option key={event.eventId} value={String(event.eventId)}>
                    {eventOptionLabel(event)}
                  </option>
                ))}
              </SelectField>
              {eventError && <div className="mt-[5px] text-[12.5px] text-n500">{eventError}</div>}
              <div className="mt-[5px] text-[13px] leading-[1.6] text-n500">
                공개 화면의 포스트에서 그 행사로 이어집니다. 행사 하나에 포스트 여러 개도 됩니다.
              </div>
            </Field>
          </div>
        </Card>
      </div>

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
        attach={{
          uploading: imageUpload.pending,
          lock: galleryLock,
          error: galleryError?.at === "body" ? galleryError.message : null,
          // 본문에서 첨부한 이미지도 갤러리에 들어간다 — 발급 자체가 갤러리 한 장이다
          onPick: (file) => void runUpload(file, "body"),
        }}
        footnote="첨부한 이미지는 갤러리에도 들어갑니다"
      />

      <ContentGallery
        gallery={gallery}
        coverFileId={coverFileId}
        uploading={imageUpload.pending}
        deletingFileId={deletingFileId}
        lock={galleryLock}
        error={galleryError?.at === "gallery" ? galleryError.message : null}
        onPick={(file) => void runUpload(file, "gallery")}
        onDelete={(fileId) => void runDelete(fileId)}
        onCover={setCoverFileId}
        onInsert={placeImageInBody}
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
