"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approvalTone, useApprovalStore, type Approval } from "@/entities/approval";
import { RejectSheet, useApprovalActions } from "@/features/approval";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  Pill,
  ProgressBar,
} from "@/shared/ui";

const TABS = ["대기", "승인", "반려"] as const;

export function ApprovalBoxPage() {
  const router = useRouter();
  const approvals = useApprovalStore((s) => s.approvals);
  const { decide, vote } = useApprovalActions();
  const [tab, setTab] = useState<(typeof TABS)[number]>("대기");
  const [rejectTarget, setRejectTarget] = useState<Approval | null>(null);

  const filtered = approvals.filter((a) => a.state === tab);

  return (
    <>
      <PageHeader title="승인함" subtitle="대기 · 정족수 · 긴급" />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[7px]">
          {TABS.map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
              {t}
            </Chip>
          ))}
          <div className="flex-1" />
          <div className="text-[14px] text-n500">{filtered.length}건</div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState message="해당 상태의 승인 건이 없습니다." className="py-14" />
        ) : (
          <div className="grid grid-cols-2 gap-[14px]">
            {filtered.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={approvalTone(a.state)}>{a.state}</Badge>
                  <Badge tone="grey">{a.type}</Badge>
                  {a.urgent && <Pill tone="red">긴급</Pill>}
                  {a.post && <Pill tone="outline">사후 승인</Pill>}
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">{a.stage}</div>
                </div>
                <div
                  onClick={() => router.push(ROUTES.taskDetail(a.task))}
                  className="mt-2 cursor-pointer text-[17px] font-semibold hover:text-accent"
                >
                  {a.title}
                </div>
                <div className="mt-1 text-[13.5px] text-n500">
                  요청 {a.owner} · {a.requested}
                </div>
                {a.quorum && (
                  <div className="mt-3 flex items-center gap-[10px]">
                    <ProgressBar
                      value={Math.round((a.quorum.yes / a.quorum.need) * 100)}
                    />
                    <div className="text-[13.5px] whitespace-nowrap text-n400">
                      정족수 {a.quorum.yes}/{a.quorum.need} 동의
                    </div>
                  </div>
                )}
                {a.state === "반려" && a.reason && (
                  <div className="mt-2 text-[14px] text-danger">
                    반려 사유 · {a.reason}
                  </div>
                )}
                {a.state === "대기" && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <Button variant="ghost" size="sm" onClick={() => vote(a.id, true)}>
                      찬성
                    </Button>
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      onClick={() => vote(a.id, false)}
                    >
                      반대
                    </Button>
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      onClick={() => setRejectTarget(a)}
                    >
                      반려
                    </Button>
                    <Button size="sm" onClick={() => decide(a.id, a.task, true)}>
                      승인
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <RejectSheet
          open={rejectTarget !== null}
          onClose={() => setRejectTarget(null)}
          onReject={(reason) => {
            if (rejectTarget) decide(rejectTarget.id, rejectTarget.task, false, reason);
          }}
        />
      </PageBody>
    </>
  );
}
