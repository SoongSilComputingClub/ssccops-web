"use client";

import { useRef, useState } from "react";
import type { EventDetail, EventSaveInput } from "@/entities/event";
import { FIELD_LABEL } from "@/shared/config/labels";
import { fromInput, toInput } from "@/shared/lib/date";
import { Button, Card, Field, SectionLabel, SelectField, TextArea, TextField } from "@/shared/ui";
import { useEventCategoryOptions } from "../model/use-event-category-options";
import { useEventImageUpload } from "../model/use-event-image-upload";
import { useFormLinkOptions } from "../model/use-form-link-options";

/*
 * 행사 입력 폼 (#136) — 등록(views/event-new)과 수정(views/event-edit)이 함께 쓴다.
 *
 * 업무의 등록 화면(운영 등록)과 달리 재사용해도 되는 이유: 그쪽은 세 종류를 한 상태 기계로
 * 다뤄 수정을 얹으면 분기가 얽히지만, 행사는 생성과 수정이 **같은 본문**을 쓰는 한 종류다
 * (서버 계약이 그렇다). 갈리는 것은 제출 대상(POST/PUT)과 저장 후 이동뿐이라 그 둘만 뷰가
 * 정한다. 두 뷰가 같은 폼을 나눠 쓰므로 views가 아니라 features/event/ui에 둔다(FSD —
 * views 슬라이스끼리는 참조하지 않는다).
 *
 * **저장 상태·모집 기간 입력란이 없다.**
 * - 상태는 저장 본문에 없다(D9) — 게시·보관은 수정 화면의 전이 버튼으로만 바뀐다.
 * - 모집 기간은 연결한 폼이 유일한 진실이다(D3) — 여기 입력란을 두면 두 벌이 된다.
 *
 * 수정 화면은 상세 조회가 ready가 된 뒤에야 이 폼을 마운트한다 — useState 초깃값이 곧 폼
 * 초깃값이라 동기화용 useEffect가 필요 없다(AGENTS.md · work-edit과 같은 판단).
 */

/** 본문 상한 — 서버 413 EVENT_CONTENT_TOO_LARGE와 같은 값. 왕복 없이 먼저 알린다 */
const MTXT_CN_MAX_LENGTH = 100_000;

/*
 * 파일 선택 창이 이미지만 보이게 하는 힌트다 — **검증이 아니다.**
 *
 * 허용 형식의 판정은 서버에만 있다(ssccops-server#161). 웹이 목록을 복제하면 서버가 형식을
 * 늘린 날에도 화면만 계속 막고, 사용자는 왜 막혔는지 알 길이 없다. 여기 값은 고를 때의
 * 편의일 뿐이고 최종 판정은 업로드 응답 코드로 안내한다.
 */
const IMAGE_ACCEPT = "image/*";

/** 등록 화면에서 첨부가 잠기는 사유 — 발급 주소가 /v1/events/{eventId}/images 라 행사가 먼저 있어야 한다 */
const NEED_SAVED_EVENT =
  "행사를 먼저 등록한 뒤 수정 화면에서 이미지를 올릴 수 있습니다";

/** 화면이 입력란과 오류를 묶는 데 쓰는 칸 이름 */
type EventFormField =
  | "eventTtl"
  | "eventClsfCd"
  | "mtxtCn"
  | "eventPeriod"
  | "ptcpLmtCnt";

/**
 * 파일 하나를 고르는 버튼.
 *
 * `input[type=file]`을 그대로 두지 않고 감춰 버튼으로 감싼 것은, 브라우저 기본 파일 입력이
 * 폼의 다른 입력란과 생김새·크기가 전혀 달라 좁은 화면에서 줄을 깨기 때문이다. 고른 뒤
 * 값을 비우는 것(`e.target.value = ""`)은 **같은 파일을 다시 고를 수 있게** 하기 위함이다 —
 * 비우지 않으면 업로드가 실패한 뒤 같은 파일로 재시도할 때 change 이벤트가 오지 않는다.
 */
function ImagePickButton({
  label,
  disabled,
  hint,
  onPick,
}: {
  label: string;
  disabled: boolean;
  /** 잠겼을 때의 사유 — 버튼을 감추지 않고 이유를 붙인다(AGENTS.md) */
  hint?: string;
  onPick: (file: File) => void;
}) {
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

export function EventForm({
  initial,
  eventId,
  busy,
  canManage,
  lockedHint,
  submitLabel,
  onSubmit,
}: {
  /** 수정이면 현재 값 전부(전체 교체 폼) · 등록이면 null */
  initial: EventDetail | null;
  /**
   * 이미지 업로드 주소가 걸리는 행사. **등록 화면은 null이다** — 발급 경로가
   * `/v1/events/{eventId}/images`라 아직 저장되지 않은 행사에는 올릴 수 없다.
   * `initial`에서 꺼내지 않고 따로 받는 것은 두 값이 뜻하는 바가 다르기 때문이다(초깃값 vs 대상).
   */
  eventId: number | null;
  /** 저장 요청이 진행 중 — 버튼을 잠근다 */
  busy: boolean;
  /** EVENT_MANAGE 보유 여부 — 저장을 잠글지 정한다 */
  canManage: boolean;
  /** 잠긴 저장 버튼에 붙는 사유 */
  lockedHint: string;
  submitLabel: string;
  onSubmit: (input: EventSaveInput) => void;
}) {
  const { categories, errorMessage: categoryError } = useEventCategoryOptions();
  const { forms, errorMessage: formError } = useFormLinkOptions();
  const imageUpload = useEventImageUpload();

  const [eventTtl, setEventTtl] = useState(initial?.eventTtl ?? "");
  const [eventClsfCd, setEventClsfCd] = useState(initial?.eventClsfCd ?? "");
  const [mtxtCn, setMtxtCn] = useState(initial?.mtxtCn ?? "");
  const [thmbUrlAddr, setThmbUrlAddr] = useState(initial?.thmbUrlAddr ?? "");
  const [eventBgngDt, setEventBgngDt] = useState(toInput(initial?.eventBgngDt ?? null, true));
  const [eventEndDt, setEventEndDt] = useState(toInput(initial?.eventEndDt ?? null, true));
  const [plcNm, setPlcNm] = useState(initial?.plcNm ?? "");
  const [ptcpLmtCnt, setPtcpLmtCnt] = useState(
    initial?.ptcpLmtCnt != null ? String(initial.ptcpLmtCnt) : "",
  );
  const [formId, setFormId] = useState(initial?.formId != null ? String(initial.formId) : "");

  const [errors, setErrors] = useState<Partial<Record<EventFormField, string>>>({});

  /*
   * 업로드 상태는 본문과 대표 이미지를 **가려서** 쥔다. 훅의 pending 하나만 보면 대표
   * 이미지를 올리는 동안 본문 영역에도 "올리는 중"이 뜬다 — 어느 자리에 들어갈 파일인지가
   * 사용자에게는 서로 다른 일이라, 진행 표시가 엉뚱한 자리에 서면 방금 무엇을 눌렀는지
   * 헷갈린다.
   */
  const [uploadingAt, setUploadingAt] = useState<"body" | "thumbnail" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mtxtRef = useRef<HTMLTextAreaElement>(null);

  /** 첨부를 잠글 사유 — 없으면 undefined(잠기지 않았다) */
  const attachLock = !canManage ? lockedHint : eventId == null ? NEED_SAVED_EVENT : undefined;

  const runUpload = async (at: "body" | "thumbnail", file: File, place: (url: string) => void) => {
    if (eventId == null) return;

    setUploadError(null);
    setUploadingAt(at);
    const { imageUrl, message } = await imageUpload.upload(eventId, file);
    setUploadingAt(null);

    // 중복 클릭이면 둘 다 비어 온다 — 아무것도 보내지 않았으므로 화면도 그대로 둔다
    if (message) setUploadError(message);
    if (imageUrl) place(imageUrl);
  };

  /**
   * 올린 이미지를 본문 Markdown에 넣는다.
   *
   * 커서 위치에 넣는 것은, 긴 본문을 쓰다가 중간에 그림을 끼우는 것이 실제 작성 순서이기
   * 때문이다(끝에만 붙이면 사용자가 매번 잘라내 옮겨야 한다). 앞뒤로 줄바꿈을 채워 문단
   * 사이에 놓는 것은 Markdown에서 문장 한가운데 낀 이미지가 그 문단에 흡수되기 때문이다.
   *
   * textarea를 잡지 못했을 때만 본문 끝에 붙인다 — 넣을 자리를 모르는 것이지 넣지 못하는
   * 것은 아니므로, 올려 둔 파일을 버리지 않는다.
   */
  const insertImageMarkdown = (url: string) => {
    const snippet = `![](${url})`;
    const el = mtxtRef.current;

    if (!el) {
      setMtxtCn((prev) => (prev && !prev.endsWith("\n") ? `${prev}\n\n${snippet}\n` : `${prev}${snippet}\n`));
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = mtxtCn.slice(0, start);
    const after = mtxtCn.slice(end);
    const lead = before && !before.endsWith("\n") ? "\n" : "";
    const trail = after && !after.startsWith("\n") ? "\n" : "";
    const inserted = `${lead}${snippet}${trail}`;

    setMtxtCn(`${before}${inserted}${after}`);

    /*
     * 값이 DOM에 반영된 뒤에 커서를 옮긴다 — 지금 옮기면 다음 렌더가 되돌린다. 그림을 넣은
     * 자리에서 글을 이어 쓰는 것이 자연스러운 다음 동작이라 포커스도 함께 돌려준다.
     */
    const caret = start + inserted.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  /*
   * 후보 목록에 지금 값이 없어도 선택 상태가 비어 보이지 않게 한 줄을 보탠다 — 분류가 방금
   * 삭제됐거나 후보 조회가 실패한 경우다. 서버가 조인해 준 이름(initial.eventClsfNm)이 있어
   * 코드만 덩그러니 보여주지 않는다.
   */
  const categoryOptions =
    initial && !categories.some((c) => c.eventClsfCd === initial.eventClsfCd)
      ? [
          { eventClsfCd: initial.eventClsfCd, eventClsfNm: initial.eventClsfNm },
          ...categories,
        ]
      : categories;

  const linkedFormMissing =
    initial?.formId != null && !forms.some((f) => f.formId === initial.formId);

  const submit = () => {
    const next: Partial<Record<EventFormField, string>> = {};

    if (!eventTtl.trim()) next.eventTtl = "행사 제목을 입력하세요";
    if (!eventClsfCd) next.eventClsfCd = "행사 분류를 선택하세요";
    if (!mtxtCn.trim()) next.mtxtCn = "본문을 입력하세요";
    else if (mtxtCn.length > MTXT_CN_MAX_LENGTH) {
      next.mtxtCn = `본문이 ${MTXT_CN_MAX_LENGTH.toLocaleString()}자를 넘습니다 — 내용을 줄여주세요`;
    }
    /* 일시는 둘 다 선택 입력이지만, 둘 다 있으면 순서는 여기서 먼저 잡는다 — 최종 판정은 서버다 */
    if (eventBgngDt && eventEndDt && eventEndDt < eventBgngDt) {
      next.eventPeriod = "종료 일시가 시작 일시보다 빠릅니다";
    }
    if (ptcpLmtCnt && (!/^[0-9]+$/.test(ptcpLmtCnt) || Number(ptcpLmtCnt) < 1)) {
      next.ptcpLmtCnt = "정원은 1 이상의 숫자여야 합니다 — 비워 두면 정원 없음입니다";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      eventClsfCd,
      eventTtl: eventTtl.trim(),
      mtxtCn,
      thmbUrlAddr: thmbUrlAddr.trim() || null,
      formId: formId ? Number(formId) : null,
      eventBgngDt: eventBgngDt ? fromInput(eventBgngDt, true) : null,
      eventEndDt: eventEndDt ? fromInput(eventEndDt, true) : null,
      plcNm: plcNm.trim() || null,
      ptcpLmtCnt: ptcpLmtCnt ? Number(ptcpLmtCnt) : null,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <SectionLabel className="mb-3">기본 정보</SectionLabel>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <Field
              label={FIELD_LABEL.eventTitle}
              required
              error={errors.eventTtl}
              className="col-span-1 lg:col-span-2"
            >
              <TextField
                value={eventTtl}
                onChange={(e) => setEventTtl(e.target.value)}
                invalid={Boolean(errors.eventTtl)}
              />
            </Field>
            <Field label={FIELD_LABEL.eventClassification} required error={errors.eventClsfCd}>
              <SelectField
                value={eventClsfCd}
                onChange={(e) => setEventClsfCd(e.target.value)}
                aria-invalid={Boolean(errors.eventClsfCd) || undefined}
              >
                <option value="">분류 선택</option>
                {categoryOptions.map((c) => (
                  <option key={c.eventClsfCd} value={c.eventClsfCd}>
                    {c.eventClsfNm}
                  </option>
                ))}
              </SelectField>
              {categoryError && (
                <div className="mt-[5px] text-[12.5px] text-n500">{categoryError}</div>
              )}
            </Field>
            <Field label={FIELD_LABEL.placeName}>
              <TextField
                value={plcNm}
                onChange={(e) => setPlcNm(e.target.value)}
                placeholder="예: 정보관 21203 · 비워도 됩니다"
              />
            </Field>
            <Field label={FIELD_LABEL.eventStartAt} error={errors.eventPeriod}>
              <TextField
                type="datetime-local"
                value={eventBgngDt}
                onChange={(e) => setEventBgngDt(e.target.value)}
                invalid={Boolean(errors.eventPeriod)}
              />
            </Field>
            <Field label={FIELD_LABEL.eventEndAt}>
              <TextField
                type="datetime-local"
                value={eventEndDt}
                onChange={(e) => setEventEndDt(e.target.value)}
                invalid={Boolean(errors.eventPeriod)}
              />
            </Field>
            <Field label={FIELD_LABEL.participantLimit} error={errors.ptcpLmtCnt}>
              <TextField
                value={ptcpLmtCnt}
                onChange={(e) => setPtcpLmtCnt(e.target.value)}
                invalid={Boolean(errors.ptcpLmtCnt)}
                inputMode="numeric"
                placeholder="비워 두면 정원 없음"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel className="mb-3">대표 이미지 · 폼 연결</SectionLabel>
          <div className="grid grid-cols-1 gap-[14px]">
            <Field label={FIELD_LABEL.thumbnailUrl}>
              {/*
                주소 입력란을 파일 업로드로 대체하지 않고 나란히 둔다 — 이미 다른 곳에 올려
                둔 이미지를 주소로 붙여 넣는 것도 정상적인 쓰임이고, 올린 결과 역시 결국
                같은 칸(thmb_url_addr)에 담기는 주소 하나다.
              */}
              <TextField
                type="url"
                value={thmbUrlAddr}
                onChange={(e) => setThmbUrlAddr(e.target.value)}
                placeholder="https:// 로 시작하는 이미지 주소 · 비워도 됩니다"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ImagePickButton
                  label={uploadingAt === "thumbnail" ? "올리는 중…" : "이미지 파일 올리기"}
                  disabled={busy || imageUpload.pending || Boolean(attachLock)}
                  hint={attachLock}
                  onPick={(file) => void runUpload("thumbnail", file, setThmbUrlAddr)}
                />
                {thmbUrlAddr.trim() && (
                  <Button variant="ghost-danger" size="sm" onClick={() => setThmbUrlAddr("")}>
                    대표 이미지 제거
                  </Button>
                )}
              </div>
              {thmbUrlAddr.trim() && (
                /*
                  next/image가 아니라 img인 것은 이미지가 R2 공개 도메인에서 오고 그 도메인이
                  서버 설정(DEV/PROD_R2_PUBLIC_BASE_URL)에만 있기 때문이다 — remotePatterns에
                  미리 적을 수 없다(공개 앱 shared/ui/markdown.tsx와 같은 판단).
                  주소가 잘못됐을 때 깨진 그림 대신 아무것도 그리지 않는 편이 낫다.
                */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  // 주소가 바뀌면 요소를 새로 만든다 — 위 onError가 숨긴 상태가 남지 않게 한다
                  key={thmbUrlAddr.trim()}
                  src={thmbUrlAddr.trim()}
                  alt=""
                  className="mt-2 h-[120px] w-full rounded-[12px] border border-line object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="mt-[5px] text-[12.5px] text-n500">
                목록 카드와 공개 화면의 대표 이미지로 쓰입니다 — 공유 링크 미리보기에도 이
                이미지가 나옵니다
              </div>
              {attachLock && (
                <div className="mt-[5px] text-[12.5px] text-n500">{attachLock}</div>
              )}
            </Field>
            <Field label={FIELD_LABEL.linkedForm}>
              <SelectField value={formId} onChange={(e) => setFormId(e.target.value)}>
                <option value="">연결 안 함 (공지형 행사)</option>
                {/*
                  후보에 없는 연결 폼도 한 줄 보탠다 — 목록 조회가 실패했거나 폼이 지워진
                  경우, 그대로 두고 저장할 길은 남겨야 한다(비우면 해제 요청이 된다).
                */}
                {linkedFormMissing && initial?.formId != null && (
                  <option value={String(initial.formId)}>연결된 폼 #{initial.formId}</option>
                )}
                {forms.map((f) => (
                  <option key={f.formId} value={String(f.formId)}>
                    {f.formTtlNm}
                  </option>
                ))}
              </SelectField>
              {formError && <div className="mt-[5px] text-[12.5px] text-n500">{formError}</div>}
              <div className="mt-[5px] text-[13px] leading-[1.6] text-n500">
                모집 기간·접수 여부는 연결한 폼이 정합니다 — 행사에는 모집 기간 입력란이
                없습니다. 폼 하나는 행사 하나에만 연결할 수 있고, 신청이 접수된 뒤에는 연결을
                바꾸거나 해제할 수 없습니다.
              </div>
            </Field>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SectionLabel>{FIELD_LABEL.eventContent} (Markdown)</SectionLabel>
          <div className="flex-1" />
          <ImagePickButton
            label={uploadingAt === "body" ? "올리는 중…" : "이미지 첨부"}
            disabled={busy || imageUpload.pending || Boolean(attachLock)}
            hint={attachLock}
            onPick={(file) => void runUpload("body", file, insertImageMarkdown)}
          />
        </div>
        <Field label={null} error={errors.mtxtCn}>
          <TextArea
            ref={mtxtRef}
            value={mtxtCn}
            onChange={(e) => setMtxtCn(e.target.value)}
            className="min-h-[260px] font-mono text-[16px] leading-[1.8] lg:text-[13.5px]"
            placeholder={"# 행사 안내\n\nMarkdown으로 작성합니다. 회원에게 보이는 본문입니다."}
          />
        </Field>
        {/*
          업로드 실패는 토스트가 아니라 이 자리에 남긴다 — 본문과 대표 이미지가 같은 훅을
          쓰므로 무엇이 왜 막혔는지 다시 볼 수 있어야 하고, 사라지는 알림이면 파일을 다시
          고르는 사이에 문구가 없어진다.
        */}
        {uploadError && <div className="mt-2 text-[12.5px] text-danger">{uploadError}</div>}
        <div className="mt-2 text-[12.5px] text-n500">
          {mtxtCn.length.toLocaleString()} / {MTXT_CN_MAX_LENGTH.toLocaleString()}자 —
          {attachLock
            ? ` ${attachLock}`
            : " 이미지를 첨부하면 커서 자리에 이미지 문법이 들어갑니다"}
        </div>
      </Card>

      <div className="mt-5">
        <Button
          className="px-[26px] py-[11px]"
          onClick={submit}
          disabled={busy || !canManage}
          title={canManage ? undefined : lockedHint}
        >
          {busy ? "저장하는 중…" : submitLabel}
        </Button>
        {!canManage && <div className="mt-2 text-[13.5px] text-n500">{lockedHint}</div>}
      </div>
    </>
  );
}
