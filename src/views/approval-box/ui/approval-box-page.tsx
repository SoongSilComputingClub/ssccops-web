"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  aprvSttsTone,
  type ApprovalInboxItem,
  type ApprovalInboxTab,
} from "@/entities/approval";
import { REJECT_REASON_MAX_LENGTH } from "@/entities/sub-work";
import { RejectSheet, useApprovalDecisions, useApprovalInbox } from "@/features/approval";
import { APRV_STTS_NM, AUTZR_ROLE_NM, type AutzrRoleCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { ddayText, formatDt, todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  ProgressBar,
  flash,
} from "@/shared/ui";

/*
 * 승인함 (ssccops-server OPS-017 조회 · OPS-010 승인·반려 · OPS-015 투표 · ssccops-web#45).
 *
 * 목 스토어(sub_work_aprv·sub_work_aprv_vote·sub_work_rjct 세 테이블을 화면에서 이어 붙이던
 * 방식)를 서버 응답 한 벌로 바꿨다 — 카드가 필요로 하는 파생 값(정족수 진행·완료 점검 요약·
 * 직전 반려 사유·내 표·승인 권한)을 모두 서버가 계산해 내려주므로 더 이상 클라이언트에서
 * 조인하지 않는다(하위 업무 상세 #39가 밟은 경로와 같다).
 *
 * 대시보드(ssccops-web#60)의 '승인 대기 목록' 카드가 이 화면과 같은 서버 응답을 미리보기로
 * 재사용한다. 그 카드는 반려·승인 버튼을 두지 않고 행 클릭 시 `?subWorkId=`를 실어 여기로
 * 이동하는데, 그 값을 받으면 대기 탭에서 해당 카드로 스크롤하고 잠깐 강조한다 — 목록 어디에
 * 있는지 찾아 스크롤하는 수고를 없애는 것이 대시보드 카드에서 버튼을 뺀 대신이다.
 */

const TABS: ApprovalInboxTab[] = ["PENDING", "APPROVED", "REJECTED"];

function ApprovalBoxSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[20px] w-2/5 rounded bg-black/5" />
          <div className="mt-3 h-[24px] w-3/5 rounded bg-black/5" />
          <div className="mt-4 h-[16px] w-full rounded bg-black/5" />
        </Card>
      ))}
    </div>
  );
}

/** 완료 점검 목록을 다 채웠는가 — 항목이 하나도 없는 유형은 채운 것으로 본다(상세와 같은 판단) */
function isChecklistDone(item: ApprovalInboxItem): boolean {
  const { completedCount, totalCount } = item.checklistSummary;
  return completedCount >= totalCount;
}

/** 대시보드 카드에서 넘어온 강조 대상. 값이 없거나 숫자가 아니면 강조하지 않는다 */
function parseHighlightSubWorkId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function ApprovalBoxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightSubWorkId = parseHighlightSubWorkId(searchParams.get("subWorkId"));
  const [tab, setTab] = useState<ApprovalInboxTab>("PENDING");
  const { approvals, status, errorMessage, totalCount, hasNext, loadingMore, loadMore, reload } =
    useApprovalInbox(tab);
  const { pendingSubWorkId, vote, decide } = useApprovalDecisions();
  const [rejectTarget, setRejectTarget] = useState<ApprovalInboxItem | null>(null);

  // 대시보드에서 넘어온 카드로 스크롤하고 잠깐 강조한다 — 대기 탭에 없으면(이미 처리된 건) 아무 일도 하지 않는다
  useEffect(() => {
    if (status !== "ready" || highlightSubWorkId == null) return;
    document
      .getElementById(`approval-card-${highlightSubWorkId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [status, highlightSubWorkId]);

  const runLoadMore = async () => {
    const message = await loadMore();
    if (message) flash(message);
  };

  const runVote = async (item: ApprovalInboxItem, choice: "AGREE" | "DISAGREE") => {
    const { result, message } = await vote(item.subWorkId, choice);
    if (message) flash(message);
    if (result) reload();
  };

  const runDecide = async (
    item: ApprovalInboxItem,
    action: "APPROVE_COMPLETE" | "REJECT",
    reason?: string,
  ) => {
    const { result, message } = await decide(item.subWorkId, action, reason ?? null);
    if (message) flash(message);
    if (result) reload();
  };

  return (
    <>
      <PageHeader title="승인함" subtitle="대기 · 정족수 · 반려" />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[7px]">
          {TABS.map((cd) => (
            <Chip key={cd} active={tab === cd} onClick={() => setTab(cd)}>
              {APRV_STTS_NM[cd]}
            </Chip>
          ))}
          <div className="flex-1" />
          {status === "ready" && <div className="text-[14px] text-n500">{totalCount}건</div>}
        </div>

        {status === "loading" && <ApprovalBoxSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "승인함을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && approvals.length === 0 && (
          <EmptyState message="해당 상태의 승인 건이 없습니다." className="py-14" />
        )}

        {status === "ready" && approvals.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {approvals.map((item) => {
                const pending = pendingSubWorkId === item.subWorkId;
                const checklistDone = isChecklistDone(item);
                const quorumUnmet = item.quorum.needed && item.quorum.met !== true;
                const approveBlockReason = !checklistDone
                  ? "완료 점검 목록을 모두 체크해야 완료 승인할 수 있습니다"
                  : quorumUnmet
                    ? "정족수를 채워야 완료 승인할 수 있습니다 — 투표가 모여야 합니다"
                    : "";
                const dday = ddayText(item.dueAt, todayInSeoul());
                const roleName =
                  AUTZR_ROLE_NM[item.authorizerRoleCode as AutzrRoleCd] ??
                  item.authorizerRoleCode ??
                  "-";

                const highlighted = item.subWorkId === highlightSubWorkId;

                return (
                  <Card
                    key={item.subWorkId}
                    id={`approval-card-${item.subWorkId}`}
                    className={highlighted ? "shadow-[0_0_0_2px_#1b64da]" : undefined}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={aprvSttsTone(item.approvalStatus)}>
                        {APRV_STTS_NM[item.approvalStatus]}
                      </Badge>
                      <Badge tone="grey">{item.subWorkTypeName || "-"}</Badge>
                      <div className="flex-1" />
                      <div className="text-[13.5px] whitespace-nowrap text-n500">
                        {formatDt(item.requestedAt) || "-"}
                      </div>
                    </div>

                    <div
                      onClick={() => router.push(ROUTES.subWorkDetail(item.subWorkId))}
                      className="mt-2 cursor-pointer text-[17px] font-semibold hover:text-accent"
                    >
                      {item.title}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[13.5px] text-n500">
                      <span>등록자 {item.registrantName || "-"}</span>
                      <span>· 승인자 {roleName}</span>
                      {dday && (
                        <span>
                          · 마감 {formatDt(item.dueAt) || "-"} ({dday})
                        </span>
                      )}
                    </div>

                    {item.checklistSummary.totalCount > 0 && (
                      <div className="mt-2 text-[13.5px] text-n400">
                        완료 점검 {item.checklistSummary.completedCount}/
                        {item.checklistSummary.totalCount}
                      </div>
                    )}

                    {item.quorum.needed && (
                      <div className="mt-3 flex items-center gap-[10px]">
                        <ProgressBar
                          value={Math.round(
                            ((item.quorum.currentCount ?? 0) /
                              Math.max(item.quorum.requiredCount ?? 1, 1)) *
                              100,
                          )}
                        />
                        <div className="text-[13.5px] whitespace-nowrap text-n400">
                          정족수 {item.quorum.currentCount ?? 0}/{item.quorum.requiredCount ?? 0}{" "}
                          동의
                        </div>
                      </div>
                    )}

                    {item.latestRejectionReason && (
                      <div className="mt-2 text-[14px] text-danger">
                        반려 사유 · {item.latestRejectionReason}
                      </div>
                    )}

                    {tab === "PENDING" && (
                      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                        {item.quorum.needed && (
                          <>
                            <Button
                              variant={item.myVote === "AGREE" ? "primary" : "ghost"}
                              size="sm"
                              disabled={pending}
                              onClick={() => void runVote(item, "AGREE")}
                            >
                              동의
                            </Button>
                            <Button
                              variant="ghost-danger"
                              size="sm"
                              disabled={pending}
                              className={
                                item.myVote === "DISAGREE"
                                  ? "border-danger bg-danger/10 text-danger"
                                  : undefined
                              }
                              onClick={() => void runVote(item, "DISAGREE")}
                            >
                              부동의
                            </Button>
                          </>
                        )}
                        {item.canReject && (
                          <Button
                            variant="ghost-danger"
                            size="sm"
                            disabled={pending}
                            className={item.quorum.needed ? undefined : "lg:col-span-2"}
                            onClick={() => setRejectTarget(item)}
                          >
                            반려
                          </Button>
                        )}
                        {item.canApprove && (
                          <Button
                            size="sm"
                            disabled={pending || approveBlockReason !== ""}
                            title={approveBlockReason || undefined}
                            className={item.quorum.needed ? undefined : "lg:col-span-2"}
                            onClick={() => void runDecide(item, "APPROVE_COMPLETE")}
                          >
                            승인
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* 커서 페이징이라 한 번에 20건까지만 온다. 탭을 바꾸면 useApprovalInbox가
                처음부터 다시 받으므로 여기서는 지금 탭의 다음 페이지만 신경 쓴다. */}
            {hasNext && (
              <div className="mt-3 flex items-center gap-3">
                <Button onClick={() => void runLoadMore()} disabled={loadingMore}>
                  {loadingMore ? "불러오는 중…" : "더 보기"}
                </Button>
                <div className="text-[13.5px] text-n500">
                  {approvals.length} / {totalCount}건
                </div>
              </div>
            )}
          </>
        )}

        <RejectSheet
          open={rejectTarget !== null}
          onClose={() => setRejectTarget(null)}
          maxLength={REJECT_REASON_MAX_LENGTH}
          onReject={(reason) => {
            if (!rejectTarget) return;
            void runDecide(rejectTarget, "REJECT", reason);
          }}
        />
      </PageBody>
    </>
  );
}
