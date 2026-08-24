"use client";

import { useState } from "react";
import type { EventDetail, EventSaveInput } from "@/entities/event";
import { FIELD_LABEL } from "@/shared/config/labels";
import { fromInput, toInput } from "@/shared/lib/date";
import { Button, Card, Field, SectionLabel, SelectField, TextArea, TextField } from "@/shared/ui";
import { useEventCategoryOptions } from "../model/use-event-category-options";
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

/** 화면이 입력란과 오류를 묶는 데 쓰는 칸 이름 */
type EventFormField =
  | "eventTtl"
  | "eventClsfCd"
  | "mtxtCn"
  | "eventPeriod"
  | "ptcpLmtCnt";

export function EventForm({
  initial,
  busy,
  canManage,
  lockedHint,
  submitLabel,
  onSubmit,
}: {
  /** 수정이면 현재 값 전부(전체 교체 폼) · 등록이면 null */
  initial: EventDetail | null;
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
              <TextField
                type="url"
                value={thmbUrlAddr}
                onChange={(e) => setThmbUrlAddr(e.target.value)}
                placeholder="https:// 로 시작하는 이미지 주소 · 비워도 됩니다"
              />
              {/* 파일 업로드는 별도 이슈(ssccops#141)의 몫이다 — 지금은 주소만 받는다 */}
              <div className="mt-[5px] text-[12.5px] text-n500">
                목록 카드와 공개 화면의 대표 이미지로 쓰입니다 — 이미지 파일 업로드는 추후
                지원됩니다
              </div>
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
        <SectionLabel className="mb-3">{FIELD_LABEL.eventContent} (Markdown)</SectionLabel>
        <Field label={null} error={errors.mtxtCn}>
          <TextArea
            value={mtxtCn}
            onChange={(e) => setMtxtCn(e.target.value)}
            className="min-h-[260px] font-mono text-[16px] leading-[1.8] lg:text-[13.5px]"
            placeholder={"# 행사 안내\n\nMarkdown으로 작성합니다. 회원에게 보이는 본문입니다."}
          />
        </Field>
        <div className="mt-2 text-[12.5px] text-n500">
          {mtxtCn.length.toLocaleString()} / {MTXT_CN_MAX_LENGTH.toLocaleString()}자 — 이미지
          첨부는 추후 지원되며 지금은 이미지 주소를 Markdown 문법으로 넣습니다
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
