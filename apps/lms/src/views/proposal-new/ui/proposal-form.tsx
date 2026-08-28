"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  QitemCard,
  nextPageSeq,
  pageSeqOf,
  validatePageAnswers,
  type QitemCpstCn,
} from "@ssccops/form-renderer";
// 배럴을 거치지 않는다 — 배럴이 SSR 로더(→ next/headers)를 재export 해 클라 번들을 오염시킨다
import { PROPOSAL_NEW_INTRO } from "@/features/proposal/model/proposal-error";
import { useProposalForm } from "@/features/proposal/model/use-proposal-form";
import { ROUTES } from "@/shared/config/routes";
import { Card } from "@/shared/ui";

/*
 * 기획안 신규 작성 폼 (#185 · 클라이언트).
 *
 * ── 왜 클라이언트인가 ──────────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그리지만, 답을 고쳐 가며 자동 저장하고 제출까지 하는 부분은
 * 서버 렌더만으로 그릴 수 없다(#128 회차 기록 폼·#171 재제출 폼과 같은 예외). SSR 로더가
 * `formId`·문항 구성을 이미 가져왔고, 뷰는 그 결과가 준비된 뒤에야 이 컴포넌트를 마운트한다.
 *
 * ── 문항·검증·자동 저장은 한 벌 그대로다 ────────────────────
 * 문항은 `@ssccops/form-renderer`의 `QitemCard`가 그리고, 필수·정규식·최대 선택 수·페이지
 * 분기는 패키지 함수(`validatePageAnswers`·훅의 `validateAnswers`)를 부른다. 기획안 전용
 * 렌더러를 새로 만들면 운영진이 문항을 하나 더할 때마다 이 화면만 따라오지 못하는데,
 * 그것이 기획안을 별도 도메인이 아니라 폼으로 받기로 한 이유(ssccops#131)를 깨뜨린다.
 *
 * ── 커리큘럼 안내를 여기에 적지 않는다 ──────────────────────
 * `1회차 | 주제 | 2026-03-05` 형식 안내는 서버 시드가 문항 문구에 직접 넣어 두었다. 화면이
 * 같은 말을 한 번 더 적으면 두 문장은 갈리고, 갈린 순간 제출자는 화면 안내대로 적었는데
 * 승인이 막힌다. 화면이 커리큘럼을 파싱하지 않는 것도 같은 결정의 다른 면이다.
 */
export function ProposalForm({
  formId,
  composition,
}: {
  formId: number;
  composition: QitemCpstCn;
}) {
  const router = useRouter();
  const form = useProposalForm(formId, composition);
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

  if (form.loadingDraft) {
    return (
      <Card>
        <p className="text-[14px] text-n500">작성 중이던 내용을 불러오는 중입니다…</p>
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
    if (outcome === "not-accepting") {
      setFlash("접수가 마감됐습니다 — 작성한 내용을 따로 복사해두고 접수가 열리면 다시 제출해주세요");
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
        {form.restored
          ? "이어서 작성 중입니다 — 이전에 쓰다 만 내용이 채워져 있습니다."
          : PROPOSAL_NEW_INTRO}
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

      <SaveLine save={form.save} onRetry={form.retrySave} />

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
          {isLast ? (form.submitting ? "제출 중…" : "제출하기") : "다음"}
        </button>
      </div>
    </div>
  );
}

/*
 * 자동 저장 상태 한 줄 — 어드민 `FormSaveStatusBar`를 옮기지 않고 이 화면에 맞춰 줄인다.
 * 재제출 폼(#171)에는 이 줄이 없다(초안이 없어서다) — 신규 작성에만 붙는다.
 */
function SaveLine({
  save,
  onRetry,
}: {
  save: ReturnType<typeof useProposalForm>["save"];
  onRetry: () => void;
}) {
  if (save.state === "failed") {
    return (
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[2px] rounded-2xl border border-amber/35 bg-amber/10 px-[14px] py-[10px] text-[12.5px] text-amber">
        <span>{save.message}</span>
        {!save.retrying && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer underline underline-offset-2"
          >
            다시 저장
          </button>
        )}
      </div>
    );
  }

  const text =
    save.state === "saving"
      ? "저장 중…"
      : save.state === "pending"
        ? "곧 저장됩니다…"
        : save.state === "saved"
          ? `${save.savedAt} 저장됨`
          : "";

  if (!text) return null;
  return <div className="px-[4px] text-[12.5px] text-n500">{text}</div>;
}
