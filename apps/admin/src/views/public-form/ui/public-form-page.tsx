"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Qitem } from "@/entities/form";
import {
  FORM_NOT_ACCEPTING_MESSAGE,
  FormSaveStatusBar,
  nextPageSeq,
  pageSeqOf,
  selectedOptions,
  toggleOption,
  usePublicForm,
  validatePageAnswers,
} from "@/features/form";
import { isChoiceQitemType } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatDt } from "@/shared/lib/date";
import { EmptyState, flash } from "@/shared/ui";
import { PublicFormNotice } from "./public-form-notice";

/*
 * 응답자 화면 (/f/{formId}).
 *
 * 폼은 **공개 폼 전용 조회**(GET /v1/forms/{id}/public)에서 온다. 예전에는 운영자용 폼 목록
 * 목 스토어에서 꺼냈는데, 응답자에게는 그 목록에 접근할 권한이 없을뿐더러 접수 가능 여부를
 * 판정하지 않아 DRAFT·마감된 폼의 문항이 링크만으로 열렸다.
 *
 * 진행 상태(현재 페이지)는 여기 있고, 답·검증·자동 저장·제출은 usePublicForm이 갖는다 —
 * 페이지 이동은 화면의 관심사지만 답은 서버로 나가는 값이라 훅에 두는 편이 경계가 맞다.
 *
 * 로그인·가입 여부는 신경 쓰지 않는다. /f/* 는 미들웨어와 AuthGate가 이미 걸러 두므로(#11)
 * 이 화면이 열렸다면 응답자는 이미 회원이다.
 */
export function PublicFormPage({ formId }: { formId: number }) {
  const router = useRouter();
  const publicForm = usePublicForm(formId);
  const [page, setPage] = useState(0);

  const { status, form } = publicForm;

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-10 lg:px-6">
        <EmptyState message="폼을 불러오는 중입니다…" />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-10 lg:px-6">
        <EmptyState message="존재하지 않는 폼입니다." />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-10 lg:px-6">
        <EmptyState
          message={publicForm.errorMessage}
          action={{ label: "다시 시도", onClick: publicForm.reload }}
        />
      </div>
    );
  }

  /*
   * 접수 불가. 서버가 DRAFT·마감·기간 전·기간 후를 한 코드로 묶었으므로 화면도 하나다 —
   * 어느 쪽인지 알려 주면 링크만 가진 사람에게 모집 준비 상황이 새어 나간다.
   * **문항은 애초에 응답에 실려 오지 않는다.**
   */
  if (status === "not-accepting") {
    return (
      <PublicFormNotice
        icon="🔒"
        title={FORM_NOT_ACCEPTING_MESSAGE}
        description="접수 기간이 아니거나 아직 공개되지 않은 폼입니다. 접수 일정은 안내받은 채널에서 확인해주세요."
        action={{ label: "다시 확인", onClick: publicForm.reload }}
      />
    );
  }

  if (status === "already-submitted" || form === null) {
    return (
      <PublicFormNotice
        icon="✓"
        tone="success"
        title="이미 제출한 폼입니다"
        description={
          <>
            {form?.formTtlNm ? `${form.formTtlNm} 응답이 접수됐어요. ` : ""}
            {form?.submittedAt ? `제출 일시 ${formatDt(form.submittedAt)}. ` : ""}
            결과는 등록한 연락처로 안내드려요.
          </>
        }
      />
    );
  }

  const { pages, qitems } = form.qitemCpstCn;

  if (pages.length === 0 || qitems.length === 0) {
    return (
      <PublicFormNotice
        icon="!"
        title="아직 문항이 준비되지 않았습니다"
        description="운영진에게 문의해주세요."
      />
    );
  }

  /* 분기로 페이지 수가 줄어드는 폼은 없지만, 다시 불러온 구성이 더 짧을 수 있어 범위를 지킨다 */
  const currentPage = Math.min(page, pages.length - 1);
  const pageQitems = qitems.filter((q) => pageSeqOf(q) === currentPage);
  const isLast = currentPage >= pages.length - 1;

  const goTo = (next: number) => {
    setPage(next);
    window.scrollTo(0, 0);
  };

  const onNext = async () => {
    /*
     * 화면 검증은 '다음'·'제출'에서만 돈다 — **자동 저장 경로에는 걸지 않는다.** 작성 중에
     * 필수가 비어 있는 것은 정상이고, 걸면 다 채우기 전까지 아무것도 저장되지 않는다.
     */
    const issues = validatePageAnswers(form.qitemCpstCn, publicForm.answers, currentPage);
    if (Object.keys(issues).length > 0) {
      publicForm.setErrors(issues);
      flash("입력을 확인해주세요");
      return;
    }
    publicForm.setErrors({});

    if (!isLast) {
      goTo(nextPageSeq(form.qitemCpstCn, currentPage, publicForm.answers));
      return;
    }

    const outcome = await publicForm.submit();
    if (outcome === "submitted") {
      router.push(ROUTES.publicFormDone(form.formId));
      return;
    }
    if (outcome === "invalid") {
      // 제출은 도달한 페이지 전부를 다시 본다 — 다른 페이지가 걸렸다면 그 페이지로 데려간다
      const firstInvalid = qitems.find((q) => publicForm.errors[q.qitemId]);
      if (firstInvalid) goTo(pageSeqOf(firstInvalid));
      flash("입력을 확인해주세요");
      return;
    }
    if (outcome === "stale") {
      flash("폼의 문항이 바뀌었습니다. 새로고침한 뒤 다시 시도해주세요");
      return;
    }
    if (outcome === "failed") flash("제출하지 못했습니다");
  };

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pt-7 pb-10 lg:px-6">
      <div className="rounded-2xl bg-surface px-[18px] py-[22px] shadow-[0_0_0_1px_#e5e8eb] lg:px-6">
        <div className="flex items-center gap-[10px]">
          <div className="flex size-[26px] items-center justify-center rounded-[7px] border border-accent text-[13px] text-accent">
            S
          </div>
          <div className="text-[15px] font-semibold">SSCC</div>
        </div>
        <div className="mt-3 text-[24px] leading-[1.3] font-bold">{form.formTtlNm}</div>
        <div className="mt-1 text-[13.5px] text-n500">
          {form.rcptBgngDt
            ? `접수 ${formatDt(form.rcptBgngDt)} ~ ${formatDt(form.rcptEndDt) || "미정"}`
            : "접수 기간 미정"}
        </div>
        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round(((currentPage + 1) / pages.length) * 100)}%` }}
          />
        </div>
        <div className="mt-1 text-[12.5px] text-n500">
          {currentPage + 1} / {pages.length} 페이지
        </div>
      </div>

      {/*
       * 자동 저장 상태는 화면에 **항상** 보여야 한다. 버튼을 누르지 않았는데 값이 서버로 나가는
       * 구조라, 저장됐는지 실패했는지 볼 곳이 없으면 "저장된 줄 알았는데 사라졌다"를 겪고 나서야
       * 알게 된다. 편집기와 같은 표시줄을 쓴다.
       */}
      <FormSaveStatusBar save={publicForm.save} onRetry={publicForm.retrySave} />

      {/*
        다중 응답 폼에서 이미 낸 것이 있을 때 (ssccops-server #143).

        같은 주소를 다시 열면 빈 작성 화면이 뜨는데, 그것만으로는 지난 제출이 사라진 것인지
        원래 여러 건을 받는 폼인지 알 수 없다 — 1건 폼이라면 이 자리에 '이미 제출한 폼입니다'가
        떴을 것이므로, 그와 갈리는 이유를 여기서 밝힌다.
      */}
      {form.mltplRspnsYn && form.myResponseCount > 0 && (
        <div className="rounded-[12px] border border-line bg-surface px-3 py-[10px] text-[13.5px] text-n400">
          이미 {form.myResponseCount}건을 제출했습니다 — 이 폼은 여러 건을 받으므로 계속
          작성할 수 있습니다.
        </div>
      )}

      {publicForm.restored && (
        <div className="rounded-[12px] border border-accent/30 bg-accent/8 px-3 py-[10px] text-[13.5px] text-accent">
          이어서 작성 중입니다 — 지난번에 쓰던 답변을 불러왔어요
        </div>
      )}

      {publicForm.submitMessage && (
        <div className="rounded-[12px] border border-danger/35 bg-danger/10 px-3 py-[10px] text-[13.5px] text-danger">
          {publicForm.submitMessage}
        </div>
      )}

      <div className="rounded-2xl bg-surface px-[18px] py-[22px] shadow-[0_0_0_1px_#e5e8eb] lg:px-6">
        <div className="text-[18px] font-semibold">
          {currentPage + 1}. {pages[currentPage]?.pageTtl}
        </div>
        {pages[currentPage]?.pageDescCn && (
          <div className="mt-1 text-[14px] whitespace-pre-line text-n400">
            {pages[currentPage].pageDescCn}
          </div>
        )}
      </div>

      {pageQitems.map((q) => (
        <QitemCard
          key={q.qitemId}
          qitem={q}
          value={publicForm.answers[q.qitemId]}
          error={publicForm.errors[q.qitemId]}
          onChange={(value) => publicForm.setAnswer(q.qitemId, value)}
        />
      ))}

      <div className="mt-1 flex gap-2">
        {currentPage > 0 && (
          <button
            type="button"
            onClick={() => goTo(Math.max(0, currentPage - 1))}
            className="flex-1 cursor-pointer rounded-[14px] border border-line-strong bg-surface py-[14px] text-[15.5px] text-n300 hover:border-accent hover:text-accent"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={() => void onNext()}
          disabled={publicForm.submitting}
          className="flex-[2] cursor-pointer rounded-[14px] border border-accent bg-accent py-[14px] text-[15.5px] font-bold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLast ? (publicForm.submitting ? "제출 중…" : "제출하기") : "다음"}
        </button>
      </div>
    </div>
  );
}

/*
 * 문항 한 칸.
 *
 * 값의 모양은 **저장 계약 그대로**다 — 다중선택만 배열이고 나머지는 문자열이다. 예전에는
 * 단일선택도 `[option]`으로 들고 있다가 서버가 벗겨 굳혔는데, 그러면 자동 저장이 복원해 온 값
 * (문자열)과 화면이 만든 값(배열)의 모양이 달라 같은 답인데도 저장이 한 번 더 나간다.
 */
function QitemCard({
  qitem,
  value,
  error,
  onChange,
}: {
  qitem: Qitem;
  value: string | string[] | undefined;
  error?: string;
  onChange: (value: string | string[]) => void;
}) {
  const selected = selectedOptions(value);
  const text = typeof value === "string" ? value : "";

  return (
    <div
      className={cn(
        "rounded-2xl bg-surface px-[18px] py-4",
        error ? "shadow-[0_0_0_1px_#f04452]" : "shadow-[0_0_0_1px_#e5e8eb]",
      )}
    >
      <div className="text-[16px] font-semibold">
        {qitem.qitemLblNm}
        {qitem.reqYn && <span className="ml-1 text-danger">*</span>}
      </div>
      {isChoiceQitemType(qitem.qitemTypeCd) && (
        <div className="mt-[2px] text-[12.5px] text-n500">
          {qitem.qitemTypeCd === "SINGLE_CHOICE"
            ? "하나만 선택"
            : `여러 개 선택 가능${qitem.maxSlctCnt ? ` · 최대 ${qitem.maxSlctCnt}개` : ""}`}
        </div>
      )}
      {qitem.ptrnCn && (
        <div className="mt-[2px] text-[12.5px] text-n500">형식 · {qitem.ptrnNm}</div>
      )}

      {qitem.qitemTypeCd === "LONG_TEXT" ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="자유롭게 작성해주세요"
          className="mt-3 min-h-[104px] w-full resize-y rounded-[12px] border border-line px-[11px] py-[9px] text-[16px] outline-none placeholder:text-n500 focus:border-accent lg:text-[15.5px]"
        />
      ) : qitem.qitemTypeCd === "SHORT_TEXT" || qitem.qitemTypeCd === "DATE" ? (
        <input
          type={qitem.qitemTypeCd === "DATE" ? "date" : "text"}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="mt-3 w-full rounded-[12px] border border-line px-[11px] py-[9px] text-[16px] outline-none placeholder:text-n500 focus:border-accent lg:text-[15.5px]"
        />
      ) : (
        <div className="mt-3 flex flex-col gap-1">
          {qitem.optionList.map((o) => {
            const picked = selected.includes(o);
            return (
              <div
                key={o}
                onClick={() => onChange(toggleOption(qitem, value, o))}
                className={cn(
                  "flex cursor-pointer items-center gap-[10px] rounded-[12px] px-[10px] py-[13px] text-[15px] lg:py-[11px]",
                  picked ? "bg-accent/8" : "hover:bg-black/2",
                )}
              >
                <div
                  className={cn(
                    "size-[18px] flex-none border",
                    qitem.qitemTypeCd === "SINGLE_CHOICE" ? "rounded-full" : "rounded-[5px]",
                    picked ? "border-accent bg-accent" : "border-line-strong",
                  )}
                />
                <span className="min-w-0 break-words">{o}</span>
              </div>
            );
          })}
        </div>
      )}
      {error && <div className="mt-2 text-[13.5px] text-danger">{error}</div>}
    </div>
  );
}
