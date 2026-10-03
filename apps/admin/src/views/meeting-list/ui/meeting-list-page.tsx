"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mtgSttsTone, type MeetingListItem } from "@/entities/meeting";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useMeetingList } from "@/features/meeting";
import { OperationTagFilter, OperationTagPills } from "@/features/operation-tag";
import { ATND_TRGT_NM, MTG_SE_NM, MTG_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { Badge, Card, EmptyState, PageBody, PageHeader } from "@/shared/ui";

/*
 * 회의 (ssccops-server OPS-031 · GET /v1/meetings, #83 · ssccops-web#56).
 *
 * 목 스토어를 조합해 그리던 화면을 서버 응답 한 벌로 바꿨다 — 예전에는 mtg·oper·mtg_dtl·mbr
 * 네 스토어를 화면에서 이어 붙였는데, 지금은 카드 한 장에 필요한 값(책임자 이름·안건 건수
 * 포함)을 서버가 이미 묶어 내려준다(work-list-page.tsx와 같은 이행).
 *
 * 업무 목록과 달리 커서 페이징이 없다 — 서버가 전량을 한 번에 내린다. '더 보기' 버튼이 없는
 * 이유다.
 *
 * 태그 줄(#771 · 서버 #640)은 업무·하위 업무 목록과 같은 한 벌이고 서버가 `tagId`로 거른다. 후보 조회는
 * WORK_READ라 그 권한이 없는 회원에게는 줄이 그려지지 않는다(목록은 그대로 쓴다).
 */

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MEETING_MANAGE = "회의를 등록할 권한이 없습니다 — 회의 관리(MEETING_MANAGE) 권한이 필요합니다";

function MeetingCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[96px] rounded-full bg-fill" />
      <div className="mt-3 h-[24px] w-3/5 rounded bg-fill" />
      <div className="mt-2 h-[16px] w-2/5 rounded bg-fill" />
      <div className="mt-2 h-[16px] w-1/2 rounded bg-fill" />
    </Card>
  );
}

function MeetingCard({ meeting, onClick }: Readonly<{ meeting: MeetingListItem; onClick: () => void }>) {
  return (
    <Card onClick={onClick}>
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        <Badge tone={mtgSttsTone(meeting.meetingStatus)}>
          {meeting.meetingStatus ? MTG_STTS_NM[meeting.meetingStatus] : "-"}
        </Badge>
        <Badge tone="grey">
          {meeting.meetingCategory ? MTG_SE_NM[meeting.meetingCategory] : "-"}
        </Badge>
        <span className="font-mono text-[12.5px] text-n500">회의 #{meeting.meetingId}</span>
        <div className="flex-1" />
        <div className="text-[13.5px] text-n500">안건 {meeting.agendaCount}건</div>
      </div>
      <div className="mt-2 text-[18px] font-semibold">{meeting.title}</div>
      <OperationTagPills tags={meeting.tags} className="mt-[6px] flex flex-wrap gap-[6px]" />
      <div className="mt-1 text-[14px] text-n400">
        {formatDt(meeting.startAt) || "-"} · {meeting.location ?? "-"}
      </div>
      <div className="mt-[2px] text-[13.5px] text-n500">
        책임자 {meeting.personInCharge?.name || "-"} · 참석 대상{" "}
        {meeting.attendeeScope ? ATND_TRGT_NM[meeting.attendeeScope] : "-"}
      </div>
    </Card>
  );
}

export function MeetingListPage() {
  const router = useRouter();
  const [tagId, setTagId] = useState<number | null>(null);
  const { meetings, status, errorMessage, reload } = useMeetingList(tagId);

  /*
   * 조회(GET /v1/meetings)는 MEETING_READ만 있어도 되지만(서버 #101), 등록은 여전히
   * MEETING_MANAGE다 — 그래서 목록 자체는 이동 가드(nav.ts)만으로 충분하고, 여기서는
   * '+ 등록' 버튼만 잠근다. 잠금을 붙이는 것은 권한이 방금 회수된 경우 때문이다.
   */
  const canManage = useCan(CAPABILITY.MEETING_MANAGE);
  // 회의 목록에서 들어간 등록 폼은 운영_유형 선택 카드를 회의 하나로 고정한다
  const openCreate = () => router.push(`${ROUTES.operationNew}?kind=MEETING`);

  // 태그로 거른 결과가 비면 칩 조합 탓이다 — «회의가 없다»로 읽히지 않게 하고 풀 길을 둔다
  const emptyMessage = tagId === null ? "등록된 회의가 없습니다." : "조건에 맞는 회의가 없습니다.";
  let emptyAction: { label: string; onClick: () => void } | undefined;
  if (tagId !== null) emptyAction = { label: "태그 해제", onClick: () => setTagId(null) };
  else if (canManage) emptyAction = { label: "+ 등록", onClick: openCreate };

  return (
    <>
      <PageHeader
        title="회의"
        subtitle="정례 · 주제 회의"
        action={{
          label: "+ 등록",
          onClick: openCreate,
          disabled: !canManage,
          title: canManage ? undefined : NO_MEETING_MANAGE,
        }}
      />
      <PageBody>
        <OperationTagFilter tagId={tagId} onChange={setTagId} className="mb-[14px]" />

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <MeetingCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "회의 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (meetings.length === 0 ? (
            <EmptyState message={emptyMessage} action={emptyAction} />
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {meetings.map((m) => (
                <MeetingCard
                  key={m.meetingId}
                  meeting={m}
                  onClick={() => router.push(ROUTES.meetingDetail(m.meetingId))}
                />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
