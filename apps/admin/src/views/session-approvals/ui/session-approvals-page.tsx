"use client";

import type { SessionCrossListItem } from "@/entities/academic-session";
import { useSessionReview } from "@/features/academic-session";
import { PageBody, PageHeader, flash } from "@/shared/ui";
import { SessionReviewDetail } from "./session-review-detail";
import { SessionReviewList } from "./session-review-list";

/*
 * 회차·출석 승인 (#129 · ssccops-server #136).
 *
 * 학술국장이 여러 활동의 제출된 회차 기록을 한 화면에서 확인하고 개별 승인·수정요청한다.
 * 활동 하나에 종속된 조회가 아니라 **활동 횡단 조회**를 쓰는 첫 화면이다
 * (GET /v1/academic-programs/reviews/sessions).
 *
 * ── 좌우 2열 ──────────────────────────────────────────────
 * 좌측은 승인 대기 목록(활동명·회차·출석 요약), 우측은 선택 항목 상세(진행 내용·출석부·
 * 인증사진·승인/수정요청 처리)다. lg 미만에서는 한 열로 쌓인다 — 목록에서 회차를 고르면
 * 상세가 아래로 이어진다.
 *
 * ── 일괄 승인을 만들지 않는다 (#129 「지킬 것」) ──────────────
 * 프로토타입 헤더에 `일괄 승인`이 있으나 서버는 건별 전이만 받는다. 여러 요청을 이어 보내면
 * 중간에 끊겼을 때 일부만 승인된 상태로 남고 사용자는 무엇이 처리됐는지 알 수 없다.
 *
 * ── 전이 후 목록을 다시 조회한다 ────────────────────────────
 * 전이 응답으로 처리한 건만 지우면 서버가 세는 다음 페이지·전체 건수와 어긋난다 —
 * useSessionReview 가 승인·수정요청 성공 시 목록과 선택 상세를 함께 다시 부른다
 * (AGENTS.md "부분 갱신과 재조회를 가른다").
 */

export function SessionApprovalsPage() {
  const {
    sessions,
    listStatus,
    listErrorMessage,
    totalCount,
    hasNext,
    loadingMore,
    loadMore,
    reloadList,
    selected,
    detail,
    detailStatus,
    detailErrorMessage,
    select,
    reloadDetail,
    transitioning,
    runTransition,
  } = useSessionReview();

  const onSelect = (item: SessionCrossListItem) => {
    select(item.academicProgramId, item.sessionId);
  };

  const onLoadMore = async () => {
    const message = await loadMore();
    if (message) flash(message);
  };

  const onApprove = async () => {
    const message = await runTransition("APPROVE");
    flash(message || "회차를 승인했습니다.");
  };

  const onRequestRevision = async (reason: string) => {
    const message = await runTransition("REQUEST_REVISION", reason);
    flash(message || "수정요청을 보냈습니다.");
  };

  return (
    <>
      <PageHeader
        title="회차·출석 승인"
        subtitle="제출된 회차 기록을 확인하고 승인·수정요청합니다"
      />
      <PageBody maxWidth={1180}>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <SessionReviewList
            sessions={sessions}
            status={listStatus}
            errorMessage={listErrorMessage}
            totalCount={totalCount}
            hasNext={hasNext}
            loadingMore={loadingMore}
            selectedSessionId={selected?.sessionId ?? null}
            onSelect={onSelect}
            onLoadMore={() => void onLoadMore()}
            onReload={reloadList}
          />
          <SessionReviewDetail
            status={detailStatus}
            detail={detail}
            errorMessage={detailErrorMessage}
            transitioning={transitioning}
            onApprove={() => void onApprove()}
            onRequestRevision={(reason) => void onRequestRevision(reason)}
            onReload={reloadDetail}
          />
        </div>
      </PageBody>
    </>
  );
}
