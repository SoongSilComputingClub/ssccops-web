"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  QitemCard,
  nextPageSeq,
  pageSeqOf,
  validatePageAnswers,
} from "@ssccops/form-renderer";
import {
  FORM_NOT_ACCEPTING_MESSAGE,
  FormSaveStatusBar,
  usePublicForm,
} from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { EmptyState, flash } from "@/shared/ui";
import { MyResponsesPanel } from "./my-responses-panel";
import { PublicFormNotice } from "./public-form-notice";

/*
 * 본문 가로 상한은 공개 폼 계열이 **같은 값(860px)을 쓴다** — 한 곳만 고치지 말 것
 * (ssccops#153 · ssccops-web#203). 대상: admin의 public-form-page, www의 event-apply-page.
 * (당시 함께 넓혔던 admin의 기획안 화면들은 lms로 옮겨 가며 #231에서 지워졌다.)
 *
 * lms의 proposal-new-page는 아직 720px이다 — 그 앱은 그때 개발 중이라 뺐다.
 * 같은 성격의 화면이므로 개발이 끝나면 함께 860px로 맞출 것.
 *
 * 860px인 근거는 읽기 편한 줄 길이(한 줄 45~75자)다. 본문 글자가 15~16px이라 860px에서
 * 한 줄이 대략 60~70자로 그 범위에 든다. 더 넓히면 장문형 답변(textarea)에서 줄이 길어져
 * 시선이 되돌아오기 어렵고, 좁히면 선택지 많은 문항이 세로로만 늘어난다.
 *
 * **폭 제한을 푸는 것은 답이 아니다** — 문항은 단일 컬럼 세로 나열이라(QitemCard가 2단
 * 배치를 하지 않는다) 폭만 넓히면 짧은 입력칸이 화면 끝까지 늘어나 오히려 읽기 나빠진다.
 *
 * max-w는 상한이라 좁은 화면에서는 px-4가 그대로 지배한다 — 이 값은 PC에서만 효과가 있다.
 */

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
 *
 * ── 밖에서 받는 것 세 가지 (#163) ────────────────────────────
 * 기획안 화면(`/proposals/new`)이 이 컴포넌트를 그대로 쓴다. 기획안 전용 렌더러를 새로 만들면
 * 운영진이 문항을 하나 더할 때마다 그 화면만 따라오지 못하는데, 그것이 기획안을 별도 도메인이
 * 아니라 폼으로 받기로 한 이유(ssccops#131)를 정면으로 깨뜨린다.
 *
 * 그래서 **문항·검증·자동 저장·제출은 한 벌 그대로 두고, 폼마다 갈리는 세 자리만** 밖에서
 * 받는다. 셋 다 선택이고 주지 않으면 지금까지와 똑같이 동작한다:
 * - `intro` — 머리말 아래 한 칸. 그 폼을 여는 경로가 따로 말해야 하는 것이 있을 때만 쓴다.
 * - `notAccepting` — 접수 불가 안내. 링크만 받은 응답자와 스스로 찾아 들어온 회원은 다음에
 *   무엇을 해야 하는지가 다르다(전자는 안내 채널, 후자는 이 화면이 열리기를 기다리는 것이다).
 * - `doneHref` — 제출 뒤 갈 곳. 기획안은 완료 화면 대신 제출 현황으로 간다.
 *
 * 셋을 한 객체로 묶지 않은 것은 셋이 서로 다른 이유로 붙기 때문이다 — 묶으면 하나만 필요한
 * 화면도 나머지 둘을 어떻게 할지 정해야 한다.
 */
export function PublicFormPage({
  formId,
  intro,
  notAccepting,
  doneHref,
}: {
  formId: number;
  intro?: ReactNode;
  notAccepting?: { title: string; description: ReactNode };
  doneHref?: string;
}) {
  const router = useRouter();
  const publicForm = usePublicForm(formId);
  const [page, setPage] = useState(0);

  const { status, form } = publicForm;

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-10 lg:px-6">
        <EmptyState message="폼을 불러오는 중입니다…" />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-10 lg:px-6">
        <EmptyState message="존재하지 않는 폼입니다." />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-[860px] px-4 py-10 lg:px-6">
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
        title={notAccepting?.title ?? FORM_NOT_ACCEPTING_MESSAGE}
        description={
          notAccepting?.description ??
          "접수 기간이 아니거나 아직 공개되지 않은 폼입니다. 접수 일정은 안내받은 채널에서 확인해주세요."
        }
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
      router.push(doneHref ?? ROUTES.publicFormDone(form.formId));
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
    <div className="mx-auto flex max-w-[860px] flex-col gap-3 px-4 pt-7 pb-10 lg:px-6">
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

      {/* 이 폼을 여는 경로가 따로 말해야 하는 것 — 없으면 자리도 없다 (#163) */}
      {intro}

      {/*
       * 자동 저장 상태는 화면에 **항상** 보여야 한다. 버튼을 누르지 않았는데 값이 서버로 나가는
       * 구조라, 저장됐는지 실패했는지 볼 곳이 없으면 "저장된 줄 알았는데 사라졌다"를 겪고 나서야
       * 알게 된다. 편집기와 같은 표시줄을 쓴다.
       */}
      <FormSaveStatusBar save={publicForm.save} onRetry={publicForm.retrySave} />

      {/*
        다중 응답 폼의 제출 내역 (ssccops-server #143).

        낸 것이 있어도 같은 주소를 다시 열면 빈 작성 화면이 뜨는데, 그것만으로는 지난 제출이
        사라진 것인지 원래 여러 건을 받는 폼인지 알 수 없다 — 1건 폼이라면 이 자리에 '이미
        제출한 폼입니다'가 떴을 것이므로, 그와 갈리는 이유를 낸 건수·상태와 함께 밝힌다.

        건수는 공개 폼 조회의 myResponseCount가 아니라 이 목록이 말한다. 두 값이 같은 집계라도
        화면에서 두 출처를 섞으면 한쪽만 다시 불렀을 때 숫자와 목록이 어긋난다.
      */}
      {form.mltplRspnsYn && <MyResponsesPanel formId={form.formId} />}

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
 * 문항 한 칸(`QitemCard`)은 `@ssccops/form-renderer`에 있다(#152) — 공개 앱이 신청 흐름을 붙일 때
 * 같은 것을 그려야 하고, 복사하면 선택 토글·최대 선택 수 같은 규칙이 두 벌이 된다.
 */
