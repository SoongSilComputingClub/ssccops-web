"use client";

import { useRef, useState } from "react";
import type { EventDetail, EventSaveInput } from "@/entities/event";
import type { FormSummary } from "@/entities/form";
import { FIELD_LABEL } from "@/shared/config/labels";
import { fromInput, toInput } from "@/shared/lib/date";
import {
  Button,
  Card,
  Field,
  ImagePickButton,
  MTXT_MAX_LENGTH,
  MarkdownEditor,
  SectionLabel,
  SelectField,
  Sheet,
  TextField,
  insertImageMarkdown,
  moveCaretAfterRender,
  type BodyTab,
} from "@/shared/ui";
import { CLASSIFICATION_LOCKED_FOR_PROGRAM } from "../model/event-error";
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

/*
 * 본문 칸의 두 얼굴(편집·미리보기 · ssccops#274)과 첨부 버튼은 `shared/ui/markdown-editor`에
 * 있다 — 콘텐츠 페이지·포스트(#521)가 같은 편집기를 쓰면서 올렸다. 상한값도 그쪽 한 곳이다.
 */

/** 등록 화면에서 첨부가 잠기는 사유 — 발급 주소가 /v1/events/{eventId}/images 라 행사가 먼저 있어야 한다 */
const NEED_SAVED_EVENT =
  "이미지는 등록한 뒤 수정 화면에서 올립니다";

/** 화면이 입력란과 오류를 묶는 데 쓰는 칸 이름 */
type EventFormField =
  | "eventTtl"
  | "eventClsfCd"
  | "mtxtCn"
  | "eventPeriod"
  | "ptcpLmtCnt";

/*
 * 지금 저장이 **연결을 끊는가**. 확인 팝업을 띄울 조건이다 (ssccops#270).
 *
 * 서버가 가드를 걷어(ssccops-server#336) 신청이 있어도 연결이 바뀐다. 조용히 바뀌면 안 되는
 * 일이라 저장 전에 무엇이 끊기는지 알린다.
 *
 * **원래 붙어 있던 폼이 있을 때만** 뜬다. `없음 → 폼`은 잃는 것이 없고, 등록 화면은
 * initial이 null이라 자연히 걸리지 않는다. 뜨는 경우는 `폼 → 다른 폼`과 `폼 → 없음` 둘이다.
 */
function isLinkBeingBroken(initial: EventDetail | null, nextFormId: number | null): boolean {
  return initial?.formId != null && initial.formId !== nextFormId;
}

/* 끊기는 폼의 이름. 후보 조회가 실패했거나 폼이 지워졌으면 번호로 말한다 (폼 연결 SelectField와 같다) */
function brokenFormLabelOf(
  initial: EventDetail | null,
  forms: readonly FormSummary[],
  linkBeingBroken: boolean,
): string {
  if (!linkBeingBroken) return "";
  return (
    forms.find((f) => f.formId === initial?.formId)?.formTtlNm ?? `신청서 #${initial?.formId}`
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
}: Readonly<{
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
}>) {
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
   * 연결 변경을 확인받는 동안 붙잡아 둔 저장 입력 (ssccops#270).
   *
   * 열림 여부를 boolean으로 따로 두지 않고 **입력 자체**를 상태로 쥔다 — 확인을 누르는 순간
   * 보내야 할 값이 그 안에 이미 굳어 있어야, 시트가 떠 있는 사이 폼이 다시 그려져도 검증을
   * 통과한 그 값이 그대로 나간다(views/form-list의 삭제 확인 시트와 같은 판단).
   */
  const [pendingSave, setPendingSave] = useState<EventSaveInput | null>(null);
  const [bodyTab, setBodyTab] = useState<BodyTab>("편집");

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

  /** 올린 이미지를 본문 Markdown의 커서 자리에 넣는다 — 규칙은 shared/ui/markdown-editor */
  const placeImageInBody = (url: string) => {
    const el = mtxtRef.current;
    const { value, caret } = insertImageMarkdown(mtxtCn, el, url);
    setMtxtCn(value);
    if (el && caret !== null) moveCaretAfterRender(el, caret);
  };

  const nextFormId = formId ? Number(formId) : null;
  const linkBeingBroken = isLinkBeingBroken(initial, nextFormId);
  const brokenFormLabel = brokenFormLabelOf(initial, forms, linkBeingBroken);

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

  /*
   * 학술 프로그램 행사(스터디·프로젝트·트랙)의 분류 칸은 잠근다 (#587 · ssccops#435 · ADR-0043).
   * 프로그램의 구분은 분류가 아니라 유형(`academicProgram.typeNm`)이고 분류 값은 뜻이 없다 —
   * 감추지 않고 잠근 채 사유를 `title`로 붙인다(AGENTS «이동은 감추고, 동작은 잠근다»). 서버가
   * 값이 바뀐 저장만 409로 거절하므로 지금 값을 그대로 되보내는 저장은 막히지 않는다. 등록
   * 화면(`initial` 없음)에는 해당이 없다 — 프로그램 행사는 기획안 이관이 만든다.
   */
  const classificationLocked = initial?.academicProgram != null;

  const submit = () => {
    const next: Partial<Record<EventFormField, string>> = {};

    if (!eventTtl.trim()) next.eventTtl = "행사 제목을 입력하세요";
    if (!eventClsfCd) next.eventClsfCd = "행사 분류를 선택하세요";
    if (!mtxtCn.trim()) next.mtxtCn = "본문을 입력하세요";
    else if (mtxtCn.length > MTXT_MAX_LENGTH) {
      next.mtxtCn = `본문이 ${MTXT_MAX_LENGTH.toLocaleString()}자를 넘습니다 — 내용을 줄여주세요`;
    }
    /* 일시는 둘 다 선택 입력이지만, 둘 다 있으면 순서는 여기서 먼저 잡는다 — 최종 판정은 서버다 */
    if (eventBgngDt && eventEndDt && eventEndDt < eventBgngDt) {
      next.eventPeriod = "종료 일시가 시작 일시보다 빠릅니다";
    }
    if (ptcpLmtCnt && (!/^\d+$/.test(ptcpLmtCnt) || Number(ptcpLmtCnt) < 1)) {
      next.ptcpLmtCnt = "정원은 1 이상의 숫자여야 합니다";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const input: EventSaveInput = {
      eventClsfCd,
      eventTtl: eventTtl.trim(),
      mtxtCn,
      thmbUrlAddr: thmbUrlAddr.trim() || null,
      formId: nextFormId,
      eventBgngDt: eventBgngDt ? fromInput(eventBgngDt, true) : null,
      eventEndDt: eventEndDt ? fromInput(eventEndDt, true) : null,
      plcNm: plcNm.trim() || null,
      ptcpLmtCnt: ptcpLmtCnt ? Number(ptcpLmtCnt) : null,
    };

    if (linkBeingBroken) {
      setPendingSave(input);
      return;
    }
    onSubmit(input);
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
                disabled={classificationLocked}
                title={classificationLocked ? CLASSIFICATION_LOCKED_FOR_PROGRAM : undefined}
                className="disabled:cursor-not-allowed disabled:opacity-45"
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
                  /*
                    공개 화면과 **같은 정사각형 틀**이다 (ssccops#273). 여기만 비율이 다르면
                    올릴 때 확인한 그림과 실제가 달라, 미리보기가 거짓말을 한다.
                    폭을 묶는 것은 입력란 사이에 낀 자리라 1:1을 폭 그대로 두면 폼이
                    이미지 하나로 길어지기 때문이다.
                  */
                  className="mt-2 aspect-square w-full max-w-[200px] rounded-[12px] border border-line object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="mt-[5px] text-[12.5px] text-n500">
                목록 카드와 공개 화면의 대표 이미지로 쓰입니다 —{" "}
                <b>정사각형(1:1)</b>을 권장합니다. 다른 비율이면 좌우가 잘립니다
              </div>
              {/*
                공유 미리보기를 따로 적는 것은 자르는 비율을 우리가 정하지 못하기 때문이다 —
                메신저마다 다르고, 한 번 만들어진 카드는 갱신되지도 않는다(ADR-0016).
                위 문장에 이어 붙이면 "정사각형으로 나옵니다"로 읽힌다.
              */}
              <div className="mt-[3px] text-[12.5px] text-n500">
                공유 링크 미리보기에도 이 이미지가 나옵니다.
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
                모집 기간과 접수 여부는 연결한 폼이 정합니다. 폼 하나는 행사 하나에만
                연결됩니다. 연결을 바꾸면 무엇이 끊기는지 저장 전에 알려 드립니다.
              </div>
            </Field>
          </div>
        </Card>
      </div>

      <MarkdownEditor
        className="mt-4"
        label={FIELD_LABEL.eventContent}
        bodyTab={bodyTab}
        setBodyTab={setBodyTab}
        value={mtxtCn}
        onChange={setMtxtCn}
        textareaRef={mtxtRef}
        error={errors.mtxtCn}
        placeholder={"# 행사 안내\n\nMarkdown으로 작성합니다. 회원에게 보이는 본문입니다."}
        busy={busy}
        attach={{
          /*
           * 업로드 상태는 본문과 대표 이미지를 가려서 본다 — 대표 이미지를 올리는 동안 본문
           * 영역에 «올리는 중»이 뜨면 방금 무엇을 눌렀는지 헷갈린다. 잠금은 둘 다 걸린다.
           */
          uploading: uploadingAt === "body",
          lock: attachLock ?? (imageUpload.pending ? "다른 이미지를 올리는 중입니다" : undefined),
          error: uploadError,
          onPick: (file) => void runUpload("body", file, placeImageInBody),
        }}
      />

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

      <FormLinkChangeSheet
        pendingSave={pendingSave}
        setPendingSave={setPendingSave}
        brokenFormLabel={brokenFormLabel}
        initial={initial}
        onSubmit={onSubmit}
      />
    </>
  );
}

/*
 * 연결을 끊기 전 확인 (ssccops#270 · 서버 ssccops-server#336).
 * 문구가 말하는 셋은 서버가 코드로 확인한 것이다 — 지어내지 않는다.
 *
 * 열림 여부는 `pendingSave`가 말한다 — 폼이 검증을 통과한 입력을 붙잡아 둔 것이 곧 «확인
 * 중»이다(폼의 `pendingSave` 주석).
 */
function FormLinkChangeSheet({
  pendingSave,
  setPendingSave,
  brokenFormLabel,
  initial,
  onSubmit,
}: Readonly<{
  pendingSave: EventSaveInput | null;
  setPendingSave: (input: EventSaveInput | null) => void;
  /** 끊기는 폼의 이름. 비어 있으면 이름을 모른다 */
  brokenFormLabel: string;
  initial: EventDetail | null;
  onSubmit: (input: EventSaveInput) => void;
}>) {
  return (
    <Sheet
      open={pendingSave !== null}
      title="연결한 신청서를 바꿉니다"
      hint={
        brokenFormLabel
          ? `${brokenFormLabel} 연결이 이 행사에서 풀립니다`
          : "지금 연결된 신청서가 이 행사에서 떨어집니다"
      }
      okLabel="바꾸고 저장"
      onClose={() => setPendingSave(null)}
      onOk={() => {
        const input = pendingSave;
        setPendingSave(null);
        if (input) onSubmit(input);
      }}
    >
      <ul className="flex list-disc flex-col gap-[10px] pl-[18px] text-[14px] leading-[1.55]">
        <li>
          <b>받은 응답은 지워지지 않습니다.</b> 옛 신청서에 그대로 남습니다. 다만 신청자
          화면에서는 <b>내 신청</b>이 아니라 <b>내 폼 응답</b>으로 옮겨 보입니다.
        </li>
        <li>
          {/* 숫자를 말할 수 있는 것은 확정 참가자뿐이다 — 심사 중 응답 수는 화면에 오지 않는다 */}
          <b>
            이미 확정된 참가자
            {initial && initial.confirmedCount > 0 ? ` ${initial.confirmedCount}명은` : "는"}
          </b>{" "}
          명단에 그대로 남습니다.
        </li>
        <li>
          <b>옛 신청서의 응답으로는 이 행사의 참가자를 더 이상 등록할 수 없습니다.</b> 심사 중인
          응답이 있다면 승인하더라도 이 행사 명단에는 올릴 수 없습니다.
        </li>
      </ul>
    </Sheet>
  );
}
