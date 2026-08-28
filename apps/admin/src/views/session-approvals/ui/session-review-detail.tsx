"use client";

import { useState } from "react";
import { sesnSttsTone } from "@/entities/academic-program";
import type { AcademicSessionDetail } from "@/entities/academic-session";
import type { SessionDetailStatus } from "@/features/academic-session";
import { SESN_STTS_NM } from "@/shared/config/codes";
import { formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValueGrid,
  SectionLabel,
  Sheet,
  StatBox,
  TextArea,
} from "@/shared/ui";

/*
 * 우측 선택 항목 상세 (#129).
 *
 * 진행 내용·출석부·인증사진을 확인하고 승인·수정요청을 처리한다.
 *
 * ── 승인 버튼은 SUBMITTED 에서만 노출한다 ────────────────────
 * APPROVED 는 되돌릴 수 없다(서버 #136 설계 결정 3) — 그래서 승인 전에 "되돌릴 수 없습니다"를
 * 문구로 밝히고, 이미 APPROVED·REVISION_REQUESTED 인 회차에는 처리 영역 대신 상태 안내만 둔다.
 *
 * ── REQUEST_REVISION 은 사유가 필수다 ───────────────────────
 * 서버가 빈 사유를 거절하므로(reasonRequired=true) 사유 입력 시트에서 공백만 있으면 확인
 * 버튼을 잠근다 — 사유 없이 요청을 보내지 않는다.
 */

const REVISION_REASON_MAX_LENGTH = 500;

interface SessionReviewDetailProps {
  status: SessionDetailStatus;
  detail: AcademicSessionDetail | null;
  errorMessage: string;
  transitioning: boolean;
  onApprove: () => void;
  onRequestRevision: (reason: string) => void;
  onReload: () => void;
}

function DetailSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[96px] rounded-full bg-black/5" />
      <div className="mt-3 h-[26px] w-3/5 rounded bg-black/5" />
      <div className="mt-4 h-[120px] w-full rounded bg-black/5" />
      <div className="mt-4 h-[160px] w-full rounded bg-black/5" />
    </Card>
  );
}

export function SessionReviewDetail({
  status,
  detail,
  errorMessage,
  transitioning,
  onApprove,
  onRequestRevision,
  onReload,
}: SessionReviewDetailProps) {
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (status === "idle") {
    return (
      <EmptyState message="왼쪽 목록에서 회차를 선택하면 상세가 표시됩니다." />
    );
  }

  if (status === "loading") return <DetailSkeleton />;

  if (status === "not-found") {
    return (
      <EmptyState message="회차를 찾을 수 없습니다 — 이미 삭제됐거나 다른 사람이 처리했을 수 있습니다." />
    );
  }

  if (status === "error" || !detail) {
    return (
      <EmptyState
        message={errorMessage || "회차를 불러오지 못했습니다."}
        action={{ label: "다시 시도", onClick: onReload }}
      />
    );
  }

  const isSubmitted = detail.sesnSttsCd === "SUBMITTED";
  const trimmedReason = reason.trim();

  const submitRevision = () => {
    if (!trimmedReason) return;
    onRequestRevision(trimmedReason);
    setRevisionOpen(false);
    setReason("");
  };

  return (
    <div className="flex flex-col gap-4">
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
          <StatBox label="진행일" value={formatYmd(detail.actualYmd) || "-"} />
          <StatBox label="계획일" value={formatYmd(detail.planYmd) || "-"} />
        </div>

        <SectionLabel className="mt-5">회차 정보</SectionLabel>
        <KeyValueGrid
          className="mt-[10px]"
          labelWidth={92}
          items={[
            { k: "작성자", v: detail.registrantMemberName || "-" },
            { k: "진행 내용", v: detail.progressContent || "-" },
            { k: "전달사항", v: detail.noticeContent || "-" },
          ]}
        />

        {detail.latestOpinion && (
          <div className="mt-3 rounded-[12px] bg-bg px-[12px] py-[10px] text-[14px] text-n500">
            직전 수정요청 사유 · {detail.latestOpinion}
          </div>
        )}
      </Card>

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

      <Card>
        <SectionLabel className="mb-2">승인 처리</SectionLabel>
        {isSubmitted ? (
          <>
            <div className="text-[13.5px] text-n500">
              승인하면 이 회차 기록이 확정되며 되돌릴 수 없습니다. 수정이 필요하면
              사유를 적어 수정요청으로 돌려주세요.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={transitioning} onClick={onApprove}>
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
              : "수정요청한 회차입니다 — 스터디장이 다시 제출하면 목록에 올라옵니다."}
          </div>
        )}
      </Card>

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
        onOk={submitRevision}
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
    </div>
  );
}
