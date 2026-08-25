"use client";

import { useState } from "react";
import Link from "next/link";
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
import { ApplyDone } from "./apply-done";

/*
 * 신청서 작성 (wave2 D15 — 공개 앱 안에서 끝까지 쓴다).
 *
 * **문항 렌더링·검증·분기는 전부 `@ssccops/form-renderer`가 한다.** 이 파일이 갖는 것은 지금
 * 몇 번째 페이지를 보고 있는가 하나뿐이고, 답·자동 저장·제출은 `useApplyForm`이 쥔다 — 페이지
 * 이동은 화면의 관심사지만 답은 서버로 나가는 값이라 그 경계가 맞다.
 *
 * 어드민의 응답자 화면(`/f/{formId}`)과 같은 것을 그리지만 **같은 컴포넌트가 아니다.** 셸·문구·
 * 갈 곳이 다르고(여기서는 '내 신청'과 행사 안내로 잇는다), 공유해야 하는 것은 이미 패키지에
 * 있다. 문항 카드를 여기서 다시 그리는 순간 선택 토글·최대 선택 수 규칙이 두 벌이 된다.
 */
export function FormStep({ formId, eventId }: { formId: number; eventId: number }) {
  const apply = useApplyForm(formId);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);

  const { status, form } = apply;

  if (done) return <ApplyDone eventId={eventId} />;

  if (status === "loading") {
    return <EmptyState title="신청서를 불러오는 중입니다…" />;
  }

  if (status === "unauthenticated") {
    return (
      <Notice
        title="로그인이 만료되었습니다"
        description="다시 로그인하면 작성 중이던 신청서를 이어서 쓸 수 있습니다."
      >
        <SignInButton next={ROUTES.eventApply(eventId)} label="다시 로그인" />
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
        title="신청서를 찾을 수 없습니다"
        description="행사에 연결된 신청서가 사라졌거나 아직 준비되지 않았습니다 — 운영진에게 문의해 주세요."
      >
        <BackToEvent eventId={eventId} />
      </Notice>
    );
  }

  /*
   * 접수 불가. 서버가 준비 중·마감·기간 밖을 한 코드로 묶었으므로 화면도 하나다 — 어느 쪽인지
   * 알려 주면 폼의 준비 상황이 새어 나간다. **문항은 애초에 응답에 실려 오지 않는다.**
   */
  if (status === "not-accepting") {
    return (
      <Notice
        title={NOT_ACCEPTING_MESSAGE}
        description="접수 기간이 아니거나 모집이 마감되었습니다. 행사 안내에서 일정을 확인해 주세요."
      >
        <BackToEvent eventId={eventId} />
      </Notice>
    );
  }

  /*
   * 이미 낸 신청이 있다 — 다시 쓰게 하지 않고 '내 신청'으로 보낸다(D10 — 결과는 거기서 본다).
   * 서버의 판정을 그대로 따른다. 여러 건을 받는 신청서에서는 여기 오지 않고 계속 작성 화면이다.
   */
  if (status === "already-submitted" || form === null) {
    return (
      <Notice
        title="이미 신청하셨습니다"
        description="접수된 신청은 '내 신청'에서 진행 상황을 확인할 수 있습니다."
      >
        <ToMyApplications />
      </Notice>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-[10px]">
        <EmptyState title={apply.errorMessage} />
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
        title="신청서에 문항이 준비되지 않았습니다"
        description="운영진에게 문의해 주세요."
      >
        <BackToEvent eventId={eventId} />
      </Notice>
    );
  }

  /* 분기로 페이지가 줄어드는 신청서는 없지만, 다시 불러온 구성이 더 짧을 수 있어 범위를 지킨다 */
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
      setDone(true);
      window.scrollTo(0, 0);
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

function BackToEvent({ eventId }: { eventId: number }) {
  return (
    <Link
      href={ROUTES.eventDetail(eventId)}
      className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
    >
      행사 안내 보기
    </Link>
  );
}

function ToMyApplications() {
  return (
    <Link
      href={ROUTES.myApplications}
      className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
    >
      내 신청 보기
    </Link>
  );
}
