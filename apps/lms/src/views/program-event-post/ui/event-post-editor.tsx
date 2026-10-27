"use client";

import { useRef, useState } from "react";
import { SectionLabel } from "@ssccops/ui";
// 클라이언트 컴포넌트라 서버 조회를 품은 배럴에서 값을 가져오지 않는다 — 순수 모듈에서 직접
import {
  EVENT_TTL_MAX_LENGTH,
  PLC_NM_MAX_LENGTH,
  THMB_URL_MAX_LENGTH,
  eventPostLockText,
  type ProgramEventPost,
} from "@/entities/academic-program/model/event-post";
import { useEventPostActions } from "@/features/academic-program/model/use-event-post-actions";
import { Card, Field, TextField } from "@/shared/ui";
import {
  ImagePickButton,
  MTXT_MAX_LENGTH,
  MarkdownEditor,
  insertImageMarkdown,
  moveCaretAfterRender,
  type BodyTab,
} from "@/shared/ui/markdown-editor";

/*
 * 소개 글 편집기 — 클라이언트 (#819 · ADR-0069).
 *
 * 초깃값이 곧 서버가 준 값이다(SSR 셸이 조회를 끝낸 뒤에만 마운트). 저장에 성공하면 서버 응답으로
 * 갈아 끼우고 재조회하지 않는다 — 응답에 `isEditable`·`lockReason`이 함께 와서 그 사이 잠겼어도
 * 화면이 따라간다.
 *
 * 저장 전 검증은 서버 `EventSaveRequest`와 같은 한도(제목 필수·256자 · 장소 100자 · 대표 이미지 주소
 * 200자 · 본문 10만 자)만 본다. 서버가 거절할 값을 보내 실패로 보이면 서버 장애로 읽힌다.
 *
 * 업로드 상태를 본문과 대표 이미지로 갈라 쥔다 — 훅의 진행 표시 하나만 보면 대표 이미지를 올리는
 * 동안 본문 자리에도 «올리는 중»이 뜬다(어드민 `event-form.tsx`와 같은 판단).
 */

type FieldKey = "eventTtl" | "plcNm" | "thmbUrlAddr" | "mtxtCn";

export function EventPostEditor({
  academicProgramId,
  initialPost,
}: Readonly<{
  academicProgramId: number;
  initialPost: ProgramEventPost;
}>) {
  const [post, setPost] = useState(initialPost);
  const [eventTtl, setEventTtl] = useState(initialPost.eventTtl);
  const [plcNm, setPlcNm] = useState(initialPost.plcNm ?? "");
  const [thmbUrlAddr, setThmbUrlAddr] = useState(initialPost.thmbUrlAddr ?? "");
  const [mtxtCn, setMtxtCn] = useState(initialPost.mtxtCn);
  const [bodyTab, setBodyTab] = useState<BodyTab>("편집");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [uploadingAt, setUploadingAt] = useState<"body" | "thumbnail" | null>(null);
  const [uploadError, setUploadError] = useState<{ at: "body" | "thumbnail"; message: string } | null>(
    null,
  );
  const [savedAt, setSavedAt] = useState("");
  const mtxtRef = useRef<HTMLTextAreaElement>(null);

  const { saving, saveError, save, uploading, upload } = useEventPostActions(academicProgramId);
  const editable = post.isEditable;
  const thumb = thmbUrlAddr.trim();

  const touch = () => setSavedAt("");

  const runUpload = async (at: "body" | "thumbnail", file: File, place: (url: string) => void) => {
    setUploadError(null);
    setUploadingAt(at);
    const { imageUrl, message } = await upload(file);
    setUploadingAt(null);
    // 중복 클릭이면 둘 다 비어 온다 — 아무것도 보내지 않았으므로 화면도 그대로 둔다
    if (message) setUploadError({ at, message });
    if (imageUrl) {
      place(imageUrl);
      touch();
    }
  };

  const placeImageInBody = (url: string) => {
    const el = mtxtRef.current;
    const { value, caret } = insertImageMarkdown(mtxtCn, el, url);
    setMtxtCn(value);
    if (el && caret !== null) moveCaretAfterRender(el, caret);
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    const title = eventTtl.trim();
    if (!title) next.eventTtl = "제목을 입력하세요";
    else if (title.length > EVENT_TTL_MAX_LENGTH) {
      next.eventTtl = `제목은 ${EVENT_TTL_MAX_LENGTH}자까지 씁니다`;
    }
    if (plcNm.trim().length > PLC_NM_MAX_LENGTH) {
      next.plcNm = `장소는 ${PLC_NM_MAX_LENGTH}자까지 씁니다`;
    }
    if (thumb.length > THMB_URL_MAX_LENGTH) {
      next.thmbUrlAddr = `이미지 주소는 ${THMB_URL_MAX_LENGTH}자까지 씁니다`;
    }
    if (mtxtCn.length > MTXT_MAX_LENGTH) {
      next.mtxtCn = `본문이 ${MTXT_MAX_LENGTH.toLocaleString()}자를 넘습니다 — 내용을 줄여주세요`;
    }
    return next;
  };

  const onSave = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const outcome = await save({
      eventTtl: eventTtl.trim(),
      mtxtCn,
      thmbUrlAddr: thumb || null,
      plcNm: plcNm.trim() || null,
    });
    if (outcome.result === "saved") {
      // 서버가 정규화한 값이 정본이다
      setPost(outcome.post);
      setEventTtl(outcome.post.eventTtl);
      setPlcNm(outcome.post.plcNm ?? "");
      setThmbUrlAddr(outcome.post.thmbUrlAddr ?? "");
      setMtxtCn(outcome.post.mtxtCn);
      setSavedAt(new Date().toTimeString().slice(0, 5));
    }
  };

  return (
    <>
      {editable ? (
        <p className="rounded-[12px] border border-amber/45 bg-amber-soft px-[14px] py-[11px] text-[13.5px] leading-[1.7] text-amber">
          접수가 끝나기 전까지 고칠 수 있습니다. 저장하면 공개 웹사이트의 프로그램 소개에
          반영됩니다.
        </p>
      ) : (
        <p className="rounded-[12px] border border-line bg-bg px-[14px] py-[11px] text-[13.5px] leading-[1.7] text-n400">
          {eventPostLockText(post.lockReason)}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-[12px] lg:grid-cols-2">
        <Card>
          <SectionLabel>기본 정보</SectionLabel>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="제목" required={editable} error={errors.eventTtl}>
              <TextField
                value={eventTtl}
                onChange={(e) => {
                  setEventTtl(e.target.value);
                  touch();
                }}
                invalid={Boolean(errors.eventTtl)}
                disabled={!editable}
              />
            </Field>
            <Field label="장소" error={errors.plcNm}>
              <TextField
                value={plcNm}
                onChange={(e) => {
                  setPlcNm(e.target.value);
                  touch();
                }}
                invalid={Boolean(errors.plcNm)}
                disabled={!editable}
                placeholder={editable ? "예: 정보관 21203" : undefined}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>대표 이미지</SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {/*
              주소 입력란을 파일 올리기와 나란히 둔다 — 올린 결과도 결국 같은 칸에 담기는 주소
              하나다(어드민 행사 폼과 같은 모양).
            */}
            <Field label="이미지 주소" error={errors.thmbUrlAddr}>
              <TextField
                type="url"
                value={thmbUrlAddr}
                onChange={(e) => {
                  setThmbUrlAddr(e.target.value);
                  touch();
                }}
                invalid={Boolean(errors.thmbUrlAddr)}
                disabled={!editable}
                placeholder={editable ? "https://" : undefined}
              />
            </Field>
            {editable && (
              <div className="flex flex-wrap items-center gap-2">
                <ImagePickButton
                  label={uploadingAt === "thumbnail" ? "올리는 중…" : "이미지 파일 올리기"}
                  disabled={saving || uploading}
                  onPick={(file) => void runUpload("thumbnail", file, setThmbUrlAddr)}
                />
                {thumb && (
                  <button
                    type="button"
                    onClick={() => {
                      setThmbUrlAddr("");
                      touch();
                    }}
                    className="cursor-pointer whitespace-nowrap rounded-[10px] border border-line-strong px-[12px] py-[6px] text-[13.5px] text-n300 hover:border-danger hover:text-danger"
                  >
                    대표 이미지 빼기
                  </button>
                )}
              </div>
            )}
            {uploadError?.at === "thumbnail" && (
              <p className="text-[12.5px] text-danger">{uploadError.message}</p>
            )}
            {thumb && (
              /*
                next/image가 아니라 img다 — 이미지가 서버 설정에만 있는 도메인에서 온다(플랫폼 중립 ·
                공개 웹사이트 상세와 같은 판단). 정사각형 틀은 공개 화면과 같다.
              */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={thumb}
                src={thumb}
                alt=""
                className="aspect-square w-full max-w-[200px] rounded-[12px] border border-line object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <p className="text-[12.5px] text-n500">
              공개 웹사이트의 목록 카드와 상세에 정사각형으로 보입니다. 다른 비율이면 좌우가 잘립니다.
            </p>
          </div>
        </Card>
      </div>

      <MarkdownEditor
        label="본문"
        bodyTab={bodyTab}
        setBodyTab={setBodyTab}
        value={mtxtCn}
        onChange={(value) => {
          setMtxtCn(value);
          touch();
        }}
        textareaRef={mtxtRef}
        error={errors.mtxtCn}
        placeholder={"# 프로그램 소개\n\nMarkdown으로 씁니다. 공개 웹사이트에 보이는 본문입니다."}
        busy={saving || uploading}
        readOnly={!editable}
        attach={{
          uploading: uploadingAt === "body",
          error: uploadError?.at === "body" ? uploadError.message : null,
          onPick: (file) => void runUpload("body", file, placeImageInBody),
        }}
      />

      {editable && (
        <Card>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || uploading}
            className="w-full cursor-pointer rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45 lg:w-auto lg:min-w-[160px]"
          >
            {saving ? "저장 중" : "저장"}
          </button>
          {Object.keys(errors).length > 0 && (
            <p className="mt-2 text-[13px] text-danger">표시된 칸을 고쳐주세요.</p>
          )}
          {saveError && <p className="mt-2 text-[13px] text-danger">{saveError}</p>}
          {savedAt && !saveError && (
            <p className="mt-2 text-[13px] text-n500">저장됐습니다 · {savedAt}</p>
          )}
        </Card>
      )}
    </>
  );
}
