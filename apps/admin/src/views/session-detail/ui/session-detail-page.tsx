"use client";

import { useState } from "react";
import { sesnSttsTone } from "@/entities/academic-program";
import type { AcademicProgramApproval } from "@/entities/academic-session";
import { useSessionDetail } from "@/features/academic-session";
import {
  ACDM_ACTV_APRV_STTS_NM,
  SESN_STTS_NM,
  type AcdmActvAprvSttsCd,
} from "@/shared/config/codes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  Sheet,
  StatBox,
  TextArea,
  flash,
} from "@/shared/ui";

/*
 * 회차 상세 (#130 · ssccops-server #135·#139).
 *
 * 회차 이력(views/session-history)에서 회차 한 줄을 열면 온다. 회차·출석 승인 화면
 * (views/session-approvals)의 우측 상세 패널과 같은 내용을 담되, 목록 없이 한 화면으로
 * 서고 **승인 이력** 블록이 더 붙는다(이력에서 온 화면이므로 "이 회차가 어떻게 처리돼
 * 왔나"를 함께 보여 준다).
 *
 * ── 승인·수정요청은 SUBMITTED 에서만 ────────────────────────
 * APPROVED 는 되돌릴 수 없다(서버 #136 설계 결정 3). 그래서 승인 전에 "되돌릴 수
 * 없습니다"를 문구로 밝히고, 이미 APPROVED·REVISION_REQUESTED 인 회차에는 처리 영역
 * 대신 상태 안내만 둔다.
 *
 * ── REQUEST_REVISION 은 사유가 필수 ────────────────────────
 * 서버가 빈 사유를 거절한다(reasonRequired=true) — 시트에서 공백만이면 확인 버튼을 잠근다.
 */

const REVISION_REASON_MAX_LENGTH = 500;

/** 승인 이력의 상태 코드는 고정 enum — 모르는 값은 코드를 그대로 보여 준다 */
function approvalStatusLabel(code: string): string {
  return (
    ACDM_ACTV_APRV_STTS_NM[code as AcdmActvAprvSttsCd] ?? code
  );
}

function approvalStatusTone(code: string) {
  if (code === "APPROVED") return "blue" as const;
  if (code === "REVISION_REQUESTED" || code === "REJECTED")
    return "outline-red" as const;
  return "outline" as const;
}

function ApprovalHistory({
  approvals,
}: {
  approvals: AcademicProgramApproval[];
}) {
  if (approvals.length === 0) {
    return <EmptyState message="아직 처리 이력이 없습니다." padding="sm" />;
  }
  return (
    <div className="flex flex-col divide-y divide-black/6">
      {approvals.map((row) => (
        <div key={row.approvalId} className="py-[10px]">
          <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-n500">
            <Badge tone={approvalStatusTone(row.aprvSttsCd)}>
              {approvalStatusLabel(row.aprvSttsCd)}
            </Badge>
            <span>{row.approverMemberName || "-"}</span>
            <div className="flex-1" />
            <span>{formatDt(row.approvedAt) || "-"}</span>
          </div>
          {row.opinionContent && (
            <div className="mt-[6px] text-[14px] text-n300">
              {row.opinionContent}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="animate-pulse">
        <div className="h-[22px] w-[96px] rounded-full bg-black/5" />
        <div className="mt-3 h-[26px] w-3/5 rounded bg-black/5" />
        <div className="mt-4 h-[80px] w-full rounded bg-black/5" />
      </Card>
      <Card className="animate-pulse">
        <div className="h-[18px] w-[120px] rounded bg-black/5" />
        <div className="mt-4 h-[140px] w-full rounded bg-black/5" />
      </Card>
    </div>
  );
}

export function SessionDetailPage({
  academicProgramId,
  sessionId,
}: {
  academicProgramId: number;
  sessionId: number;
}) {
  const {
    status,
    errorMessage,
    detail,
    approvals,
    reload,
    transitioning,
    runTransition,
  } = useSessionDetail(academicProgramId, sessionId);

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  const onApprove = async () => {
    const message = await runTransition("APPROVE");
    flash(message || "회차를 승인했습니다.");
  };

  const submitRevision = async () => {
    if (!trimmedReason) return;
    const message = await runTransition("REQUEST_REVISION", trimmedReason);
    setRevisionOpen(false);
    setReason("");
    flash(message || "수정요청을 보냈습니다.");
  };

  if (status !== "ready" || !detail) {
    return (
      <>
        <PageHeader title="회차 상세" showBack />
        <PageBody>
          {status === "loading" && <DetailSkeleton />}
          {status === "not-found" && (
            <EmptyState message="회차를 찾을 수 없습니다 — 이미 삭제됐거나 주소가 잘못됐을 수 있습니다." />
          )}
          {status === "error" && (
            <EmptyState
              message={errorMessage || "회차를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  const isSubmitted = detail.sesnSttsCd === "SUBMITTED";

  return (
    <>
      <PageHeader title="회차 상세" showBack />
      <PageBody>
        <div className="flex flex-col gap-4">
          {/* ── 계획·진행 개요 ── */}
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={sesnSttsTone(detail.sesnSttsCd)}>
                {SESN_STTS_NM[detail.sesnSttsCd]}
              </Badge>
              <div className="text-[14px] text-n400">
                {detail.seqno != null ? `${detail.seqno}회차` : "회차"}
              </div>
            </div>
            <div className="mt-2 text-[20px] font-medium">
              {detail.curriculumTitle || "-"}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatBox
                label="출석"
                value={`${detail.presentCount} / ${detail.totalCount}`}
              />
              <StatBox
                label="진행일"
                value={formatYmd(detail.actualYmd) || "-"}
              />
              <StatBox
                label="계획일"
                value={formatYmd(detail.planYmd) || "-"}
              />
            </div>
          </Card>

          {/* ── 진행 내역 ── */}
          <Card>
            <SectionLabel className="mb-[10px]">진행 내역</SectionLabel>
            <KeyValueGrid
              labelWidth={92}
              items={[
                { k: "작성자", v: detail.registrantMemberName || "-" },
                { k: "진행 내용", v: detail.progressContent || "-" },
                { k: "전달사항", v: detail.noticeContent || "-" },
              ]}
            />
            {detail.latestOpinion && (
              <div className="mt-3 rounded-[12px] bg-bg px-[12px] py-[10px] text-[14px] text-n500">
                최근 수정요청 사유 · {detail.latestOpinion}
              </div>
            )}
          </Card>

          {/* ── 인증사진 ── */}
          <Card>
            <SectionLabel className="mb-3">출석 인증사진</SectionLabel>
            {detail.fileReference ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.fileReference.fileUrlAddr}
                alt="출석 인증사진"
                className="max-h-[320px] w-full rounded-[12px] object-contain shadow-[inset_0_0_0_1px_#e5e8eb]"
              />
            ) : (
              <EmptyState message="첨부된 인증사진이 없습니다." padding="sm" />
            )}
          </Card>

          {/* ── 출석부 ── */}
          <Card>
            <SectionLabel className="mb-3">출석부</SectionLabel>
            {detail.attendances.length === 0 ? (
              <EmptyState message="출석부가 비어 있습니다." padding="sm" />
            ) : (
              <div className="flex flex-col divide-y divide-black/6">
                {detail.attendances.map((row) => (
                  <div
                    key={row.eventParticipantId}
                    className="flex items-center justify-between py-[9px] text-[14px]"
                  >
                    <span>{row.memberName || "-"}</span>
                    <Badge tone={row.atndYn ? "blue" : "outline"}>
                      {row.atndYn ? "출석" : "불참"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── 승인 이력 ── */}
          <Card>
            <SectionLabel className="mb-3">승인 이력</SectionLabel>
            <ApprovalHistory approvals={approvals} />
          </Card>

          {/* ── 검토 처리 ── */}
          <Card>
            <SectionLabel className="mb-2">승인 처리</SectionLabel>
            {isSubmitted ? (
              <>
                <div className="text-[13.5px] text-n500">
                  승인하면 이 회차 기록이 확정되며 되돌릴 수 없습니다. 수정이
                  필요하면 사유를 적어 수정요청으로 돌려주세요.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={transitioning} onClick={() => void onApprove()}>
                    승인
                  </Button>
                  <Button
                    variant="ghost-danger"
                    disabled={transitioning}
                    onClick={() => setRevisionOpen(true)}
                  >
                    수정요청
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-[14px] text-n500">
                {detail.sesnSttsCd === "APPROVED"
                  ? "이미 승인된 회차입니다 — 승인은 되돌릴 수 없습니다."
                  : detail.sesnSttsCd === "REVISION_REQUESTED"
                    ? "수정요청한 회차입니다 — 스터디장이 다시 제출하면 승인 대기 목록에 올라옵니다."
                    : "아직 제출되지 않은 회차입니다 — 스터디장이 제출해야 승인할 수 있습니다."}
              </div>
            )}
          </Card>
        </div>

        <Sheet
          open={revisionOpen}
          title="수정요청"
          hint="무엇을 고쳐야 하는지 적어주세요. 사유는 스터디장에게 그대로 전달됩니다."
          okLabel="수정요청 보내기"
          okDisabled={!trimmedReason || transitioning}
          okTitle={!trimmedReason ? "수정요청 사유를 입력해주세요" : undefined}
          onClose={() => {
            setRevisionOpen(false);
            setReason("");
          }}
          onOk={() => void submitRevision()}
        >
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REVISION_REASON_MAX_LENGTH}
            rows={4}
            placeholder="예: 3회차 진행 내용이 계획과 다릅니다. 실제 진행한 주제로 다시 작성해주세요."
          />
          <div className="mt-1 text-right text-[12px] text-n500">
            {reason.length} / {REVISION_REASON_MAX_LENGTH}
          </div>
        </Sheet>
      </PageBody>
    </>
  );
}
