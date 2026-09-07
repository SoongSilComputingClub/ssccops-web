"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  QitemCard,
  nextPageSeq,
  pageSeqOf,
  validatePageAnswers,
} from "@ssccops/form-renderer";
import { NOT_ACCEPTING_MESSAGE, SaveStatusBar, useApplyForm } from "@/features/apply";
import { SignInButton } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import { Card, EmptyState, Notice } from "@/shared/ui";
import { formatDt } from "@/shared/lib/date";
import { MyResponsesPanel } from "./my-responses-panel";

/*
 * 공개 폼 작성 (ssccops#214 — 어드민의 `/f/{formId}`가 옮겨 온 자리).
 *
 * **문항 렌더링·검증·분기는 전부 `@ssccops/form-renderer`가 한다.** 이 파일이 갖는 것은 지금
 * 몇 번째 페이지를 보고 있는가 하나뿐이고, 답·자동 저장·제출은 `useApplyForm`이 쥔다.
 *
 * ── 왜 `useApplyForm`을 그대로 쓰는가 ────────────────────────
 * 어드민에는 `usePublicForm`이라는 거의 같은 훅이 있었다(둘 다 500줄대이고, 조회 → 초안 복원 →
 * 디바운스 저장 → 제출까지 같은 서버 경로 넷을 쓴다). 그것을 함께 옮기면 **한 앱에 같은 일을
 * 하는 훅이 둘이 되고** 서버 계약이 바뀔 때마다 두 곳을 고쳐야 한다. 이 앱의 훅이 오히려
 * 상위집합이다 — `unauthenticated`·`signup-required` 상태를 갖고 있어, 리다이렉트가 없는
 * 이 앱에서 필요한 안내를 이미 답한다.
 *
 * ── 행사 신청(`FormStep`)과 갈리는 것 ───────────────────────
 * 돌아갈 행사가 없어 출구 문구가 다르고, **여러 건을 받는 폼**을 다룬다(`mltplRspnsYn`) —
 * 제출 뒤에도 작성 화면이 계속 열리므로 그 이유를 제출 내역으로 밝힌다. 제출 후에는 완료
 * 화면(`/f/{id}/done`)으로 옮겨 간다(행사 신청은 같은 자리에서 완료를 그린다 — 그쪽은 돌아갈
 * 행사가 있어 굳이 주소를 바꿀 이유가 없다).
 */
export function PublicFormStep({ formId }: { formId: number }) {
  const router = useRouter();
  const apply = useApplyForm(formId);
  const [page, setPage] = useState(0);

  const { status, form } = apply;

  if (status === "loading") {
    return <EmptyState title="폼을 불러오는 중입니다…" />;
  }

  if (status === "unauthenticated") {
    return (
      <Notice
        title="로그인이 만료되었습니다"
        description="다시 로그인하면 작성 중이던 답을 이어서 쓸 수 있습니다."
      >
        <SignInButton next={ROUTES.publicForm(formId)} label="다시 로그인" />
      </Notice>
    );
  }

  /*
   * 가입 단계를 지나온 뒤에도 서버가 미가입이라고 답하는 경우다 — 다른 창에서 탈퇴했거나 가입이
   * 실제로는 끝나지 않았다. 새로고침을 권해 서버 판정으로 되돌린다(가입 폼이 그 자리에 다시 선다).
   */
  if (status === "signup-required") {
    return (
      <Notice
        title="회원 정보가 확인되지 않았습니다"
        description="가입이 끝나지 않았거나 회원 정보가 바뀌었습니다. 화면을 새로고침하면 가입부터 다시 진행할 수 있습니다."
      />
    );
  }

  if (status === "not-found") {
    return (
      <Notice
        title="존재하지 않는 폼입니다"
        description="주소가 잘못되었거나 폼이 삭제되었습니다 — 링크를 받은 곳에서 다시 확인해 주세요."
      />
    );
  }

  /*
   * 접수 불가. 서버가 준비 중·마감·기간 밖을 한 코드로 묶었으므로 화면도 하나다 — 어느 쪽인지
   * 알려 주면 링크만 가진 사람에게 준비 상황이 새어 나간다. **문항은 애초에 실려 오지 않는다.**
   */
  if (status === "not-accepting") {
    return (
      <Notice
        title={NOT_ACCEPTING_MESSAGE}
        description="접수 기간이 아니거나 아직 공개되지 않은 폼입니다. 접수 일정은 안내받은 채널에서 확인해 주세요."
      />
    );
  }

  /*
   * 이 회원은 더 낼 수 없다 — 1건만 받는 폼에서 제출을 마친 경우다. 여러 건을 받는 폼은 이미
   * 낸 뒤에도 `ready`로 오므로 여기 도달하지 않는다(서버의 `alreadySubmitted`가 그렇게 판정한다).
   *
   * **`form === null`을 여기 얹지 않는다.** 조회에 실패하면 훅이 `form: null`을 넣는데, 그것까지
   * 이 안내로 흡수하면 낸 적 없는 사람에게 "이미 제출했습니다"가 뜨고 아래 오류 분기는 영원히
   * 도달하지 못한다 — 실패 원인이 화면에 드러나지 않아 진단도 막힌다.
   */
  if (status === "already-submitted") {
    return (
      <Notice
        title="이미 제출한 폼입니다"
        description={
          form?.submittedAt
            ? `제출 일시 ${formatDt(form.submittedAt)} — 결과는 등록한 연락처로 안내드립니다.`
            : "결과는 등록한 연락처로 안내드립니다."
        }
      />
    );
  }

  if (status === "error" || form === null) {
    return (
      <div className="flex flex-col items-center gap-[10px]">
        <EmptyState title={apply.errorMessage || "폼을 불러오지 못했습니다"} />
        <button
          type="button"
          onClick={apply.reload}
          className="cursor-pointer rounded-xl bg-accent px-[16px] py-[11px] text-[14.5px] font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { pages, qitems } = form.qitemCpstCn;

  if (pages.length === 0 || qitems.length === 0) {
    return (
      <Notice
        title="아직 문항이 준비되지 않았습니다"
        description="운영진에게 문의해 주세요."
      />
    );
  }

  /* 분기로 페이지가 줄어드는 폼은 없지만, 다시 불러온 구성이 더 짧을 수 있어 범위를 지킨다 */
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
    const issues = validatePageAnswers(form.qitemCpstCn, apply.answers, currentPage);
    if (Object.keys(issues).length > 0) {
      apply.setErrors(issues);
      return;
    }
    apply.setErrors({});

    if (!isLast) {
      goTo(nextPageSeq(form.qitemCpstCn, currentPage, apply.answers));
      return;
    }

    const outcome = await apply.submit();
    if (outcome === "submitted") {
      router.push(ROUTES.publicFormDone(form.formId));
      return;
    }
    if (outcome === "invalid") {
      // 제출은 도달한 페이지 전부를 다시 본다 — 다른 페이지가 걸렸다면 그 페이지로 데려간다
      const firstInvalid = qitems.find((q) => apply.errors[q.qitemId]);
      if (firstInvalid) goTo(pageSeqOf(firstInvalid));
    }
    // not-accepting·stale·failed는 훅이 화면 상태나 한 줄 문구로 이미 알린다
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <Card className="flex flex-col gap-[8px]">
        <div className="text-[17px] font-semibold">{form.formTtlNm}</div>
        <div className="text-[12.5px] text-n500">
          {form.rcptBgngDt
            ? `접수 ${formatDt(form.rcptBgngDt)} ~ ${formatDt(form.rcptEndDt) || "미정"}`
            : "접수 기간 미정"}
        </div>
        <div className="h-[5px] overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round(((currentPage + 1) / pages.length) * 100)}%` }}
          />
        </div>
        <div className="text-[12.5px] text-n500">
          {currentPage + 1} / {pages.length} 페이지
        </div>
      </Card>

      <SaveStatusBar save={apply.save} onRetry={apply.retrySave} />

      {/*
        여러 건을 받는 폼의 제출 내역 (ssccops-server #143).

        낸 것이 있어도 같은 주소를 다시 열면 빈 작성 화면이 뜨는데, 그것만으로는 지난 제출이
        사라진 것인지 원래 여러 건을 받는 폼인지 알 수 없다 — 1건 폼이라면 이 자리에 '이미
        제출한 폼입니다'가 떴을 것이므로, 그와 갈리는 이유를 낸 건수·상태와 함께 밝힌다.

        건수는 `myResponseCount`가 아니라 이 목록이 말한다. 두 값이 같은 집계라도 화면에서 두
        출처를 섞으면 한쪽만 다시 불렀을 때 숫자와 목록이 어긋난다.
      */}
      {form.mltplRspnsYn && <MyResponsesPanel formId={form.formId} />}

      {apply.restored && (
        <div className="rounded-[12px] bg-accent-soft px-[13px] py-[10px] text-[13px] text-accent">
          이어서 작성 중입니다 — 지난번에 쓰던 답을 불러왔습니다
        </div>
      )}

      {apply.submitMessage && (
        <div className="rounded-[12px] bg-surface px-[13px] py-[10px] text-[13px] text-danger shadow-[0_0_0_1px_#f04452]">
          {apply.submitMessage}
        </div>
      )}

      <Card className="flex flex-col gap-[4px]">
        <div className="text-[16px] font-semibold">
          {currentPage + 1}. {pages[currentPage]?.pageTtl}
        </div>
        {pages[currentPage]?.pageDescCn && (
          <p className="text-[13.5px] leading-[1.7] whitespace-pre-line text-n400">
            {pages[currentPage].pageDescCn}
          </p>
        )}
      </Card>

      {pageQitems.map((qitem) => (
        <QitemCard
          key={qitem.qitemId}
          qitem={qitem}
          value={apply.answers[qitem.qitemId]}
          error={apply.errors[qitem.qitemId]}
          onChange={(value) => apply.setAnswer(qitem.qitemId, value)}
        />
      ))}

      <div className="mt-[2px] flex gap-[8px]">
        {currentPage > 0 && (
          <button
            type="button"
            onClick={() => goTo(Math.max(0, currentPage - 1))}
            className="flex-1 cursor-pointer rounded-[14px] bg-surface py-[13px] text-[15px] text-n300 shadow-[inset_0_0_0_1px_#d1d6db] hover:text-ink"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={() => void onNext()}
          disabled={apply.submitting}
          className="flex-[2] cursor-pointer rounded-[14px] bg-accent py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isLast ? (apply.submitting ? "제출하는 중…" : "제출하기") : "다음"}
        </button>
      </div>

      <p className="text-center text-[12.5px] leading-[1.7] text-n500">
        작성 중인 내용은 자동으로 저장됩니다 — 제출해야 접수됩니다
      </p>
    </div>
  );
}
