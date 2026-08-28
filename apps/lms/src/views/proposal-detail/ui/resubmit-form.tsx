"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  QitemCard,
  nextPageSeq,
  pageSeqOf,
  validatePageAnswers,
  type QitemCpstCn,
  type RspnsCn,
} from "@ssccops/form-renderer";
// 배럴을 거치지 않는다 — 배럴이 SSR 로더(→ next/headers)를 재export 해 클라 번들을 오염시킨다
import { PROPOSAL_RESUBMIT_NOTE } from "@/features/proposal/model/proposal-error";
import { useResubmitForm } from "@/features/proposal/model/use-resubmit-form";
import { ROUTES } from "@/shared/config/routes";
import { Card } from "@/shared/ui";

/*
 * 기획안 재제출 폼 (#171 · 클라이언트).
 *
 * ── 왜 클라이언트인가 ──────────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그리지만, 답을 고쳐 가며 제출하는 부분은 서버 렌더만으로
 * 그릴 수 없다(#128의 회차 기록 폼과 같은 예외). 상세 로더가 `ready`가 된 뒤에야 이
 * 컴포넌트를 마운트하므로 `useState` 초깃값이 곧 폼 초깃값이다 — 동기화용 `useEffect`가 없다.
 *
 * ── 프리필 ────────────────────────────────────────────────
 * 서버가 준 이전 답(`rspnsCn`)을 그대로 초깃값으로 넣는다. 재제출은 전체 본문 재전송이고
 * (서버 #177 결정 2) 임시저장이 없으므로, 사용자가 고친 값을 들고 있다가 제출 한 번으로
 * 보낸다.
 *
 * ── 검증은 `@ssccops/form-renderer` ──────────────────────────
 * 페이지 이동('다음')·제출에서 패키지 함수(`validatePageAnswers`·훅의 `validateAnswers`)를
 * 부른다. 필수·정규식·최대 선택 수·분기를 화면에서 다시 판정하지 않는다(AGENTS.md).
 */
export function ResubmitForm({
  formId,
  composition,
  initialAnswers,
}: {
  formId: number;
  composition: QitemCpstCn;
  initialAnswers: RspnsCn;
}) {
  const router = useRouter();
  const form = useResubmitForm(formId, composition, initialAnswers);
  const [page, setPage] = useState(0);
  const [flash, setFlash] = useState("");

  const { pages, qitems } = composition;

  if (pages.length === 0 || qitems.length === 0) {
    return (
      <Card>
        <p className="text-[14px] text-n300">
          이 폼의 문항을 불러오지 못했습니다 — 화면을 새로고침해주세요.
        </p>
      </Card>
    );
  }

  const currentPage = Math.min(page, pages.length - 1);
  const pageQitems = qitems.filter((q) => pageSeqOf(q) === currentPage);
  const isLast = currentPage >= pages.length - 1;

  const goTo = (next: number) => {
    setPage(next);
    setFlash("");
    window.scrollTo(0, 0);
  };

  const onNext = async () => {
    const issues = validatePageAnswers(composition, form.answers, currentPage);
    if (Object.keys(issues).length > 0) {
      form.setErrors(issues);
      setFlash("입력을 확인해주세요");
      return;
    }
    form.setErrors({});

    if (!isLast) {
      goTo(nextPageSeq(composition, currentPage, form.answers));
      return;
    }

    const outcome = await form.submit();
    if (outcome === "submitted") {
      router.push(ROUTES.myApplications);
      router.refresh();
      return;
    }
    if (outcome === "invalid") {
      // 제출은 도달한 페이지 전부를 다시 본다 — 다른 페이지가 걸렸다면 그 페이지로 데려간다
      const firstInvalid = qitems.find((q) => form.errors[q.qitemId]);
      if (firstInvalid) goTo(pageSeqOf(firstInvalid));
      setFlash("입력을 확인해주세요");
      return;
    }
    if (outcome === "stale") {
      setFlash("폼의 문항이 바뀌었습니다 — 새로고침한 뒤 다시 시도해주세요");
      return;
    }
    if (outcome === "failed") setFlash("제출하지 못했습니다");
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="rounded-2xl border border-accent/30 bg-accent-soft px-[14px] py-[11px] text-[13.5px] leading-[1.7] text-accent">
        {PROPOSAL_RESUBMIT_NOTE}
      </div>

      {pages.length > 1 && (
        <div className="flex flex-col gap-[4px]">
          <div className="h-[5px] overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width: `${Math.round(((currentPage + 1) / pages.length) * 100)}%`,
              }}
            />
          </div>
          <div className="text-[12.5px] text-n500">
            {currentPage + 1} / {pages.length} 페이지
          </div>
        </div>
      )}

      <Card>
        <div className="text-[17px] font-semibold">
          {pages.length > 1 && `${currentPage + 1}. `}
          {pages[currentPage]?.pageTtl}
        </div>
        {pages[currentPage]?.pageDescCn && (
          <p className="mt-1 text-[14px] whitespace-pre-line text-n400">
            {pages[currentPage].pageDescCn}
          </p>
        )}
      </Card>

      {pageQitems.map((q) => (
        <QitemCard
          key={q.qitemId}
          qitem={q}
          value={form.answers[q.qitemId]}
          error={form.errors[q.qitemId]}
          onChange={(value) => form.setAnswer(q.qitemId, value)}
        />
      ))}

      {form.submitMessage && (
        <div className="rounded-2xl border border-danger/35 bg-danger/10 px-[14px] py-[10px] text-[13.5px] text-danger">
          {form.submitMessage}
        </div>
      )}
      {flash && !form.submitMessage && (
        <div className="rounded-2xl border border-line px-[14px] py-[10px] text-[13.5px] text-n300">
          {flash}
        </div>
      )}

      <div className="mt-1 flex gap-2">
        {currentPage > 0 && (
          <button
            type="button"
            onClick={() => goTo(Math.max(0, currentPage - 1))}
            className="flex-1 cursor-pointer rounded-[14px] border border-line-strong bg-surface py-[14px] text-[15px] text-n300 hover:border-accent hover:text-accent"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={() => void onNext()}
          disabled={form.submitting}
          className="flex-[2] cursor-pointer rounded-[14px] border border-accent bg-accent py-[14px] text-[15px] font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLast ? (form.submitting ? "제출 중…" : "다시 제출하기") : "다음"}
        </button>
      </div>
    </div>
  );
}
