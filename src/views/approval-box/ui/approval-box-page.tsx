"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agreTally, aprvSttsTone, rjctRsnOf, useAprvStore } from "@/entities/approval";
import { useMbrStore } from "@/entities/member";
import { ownerMbrId, useSubWorkStore, type SubWork } from "@/entities/sub-work";
import { findSubWorkType, useSubWorkTypeStore } from "@/entities/sub-work-type";
import { RejectSheet, useApprovalActions } from "@/features/approval";
import { APRV_STTS_NM, type AprvSttsCd } from "@/shared/config/codes";
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

const TABS: AprvSttsCd[] = ["PENDING", "APPROVED", "REJECTED"];

export function ApprovalBoxPage() {
  const router = useRouter();
  const { subWorkAprvs, subWorkAprvVotes, subWorkRjcts } = useAprvStore();
  const { subWorks, subWorkPicAltmnts } = useSubWorkStore();
  const subWorkTypes = useSubWorkTypeStore((s) => s.subWorkTypes);
  const mbrs = useMbrStore((s) => s.mbrs);
  const { decide, vote } = useApprovalActions();
  const [tab, setTab] = useState<AprvSttsCd>("PENDING");
  const [rejectTarget, setRejectTarget] = useState<SubWork | null>(null);

  /** 승인 건은 하위 업무의 승인_상태_코드로 분류한다 */
  const rows = subWorkAprvs
    .map((aprv) => ({
      aprv,
      subWork: subWorks.find((sw) => sw.subWorkId === aprv.subWorkId),
    }))
    .filter((r): r is { aprv: (typeof subWorkAprvs)[number]; subWork: SubWork } =>
      Boolean(r.subWork && r.subWork.aprvSttsCd === tab),
    );

  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";

  return (
    <>
      <PageHeader title="승인함" subtitle="대기 · 정족수 · 긴급" />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[7px]">
          {TABS.map((cd) => (
            <Chip key={cd} active={tab === cd} onClick={() => setTab(cd)}>
              {APRV_STTS_NM[cd]}
            </Chip>
          ))}
          <div className="flex-1" />
          <div className="text-[14px] text-n500">{rows.length}건</div>
        </div>

        {rows.length === 0 ? (
          <EmptyState message="해당 상태의 승인 건이 없습니다." className="py-14" />
        ) : (
          <div className="grid grid-cols-2 gap-[14px]">
            {rows.map(({ aprv, subWork }) => {
              const type = findSubWorkType(subWorkTypes, subWork.subWorkTypeId);
              const tally = agreTally(
                subWorkAprvVotes,
                aprv.subWorkAprvId,
                type?.minNeedAgreCnt ?? null,
              );
              const rjctRsn = rjctRsnOf(subWorkRjcts, subWork.subWorkId);
              return (
                <Card key={aprv.subWorkAprvId}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={aprvSttsTone(subWork.aprvSttsCd)}>
                      {APRV_STTS_NM[subWork.aprvSttsCd]}
                    </Badge>
                    <Badge tone="grey">{type?.typeNm ?? "-"}</Badge>
                    {aprv.emrgSeCd === "URGENT" && <Pill tone="red">긴급</Pill>}
                    {aprv.epfcAprvTermYmd && <Pill tone="outline">사후 승인</Pill>}
                    <div className="flex-1" />
                    <div className="text-[13.5px] text-n500">
                      {aprv.aprvStp ? `${aprv.aprvStp}단계` : ""}
                    </div>
                  </div>
                  <div
                    onClick={() => router.push(ROUTES.subWorkDetail(subWork.subWorkId))}
                    className="mt-2 cursor-pointer text-[17px] font-semibold hover:text-accent"
                  >
                    {subWork.subWorkTtl}
                  </div>
                  <div className="mt-1 text-[13.5px] text-n500">
                    담당 {mbrNmOf(ownerMbrId(subWorkPicAltmnts, subWork.subWorkId))} ·
                    승인자 {mbrNmOf(aprv.mbrId)}
                  </div>
                  {aprv.emrgRsn && (
                    <div className="mt-1 text-[13.5px] text-n400">
                      긴급 사유 · {aprv.emrgRsn}
                    </div>
                  )}
                  {tally && (
                    <div className="mt-3 flex items-center gap-[10px]">
                      <ProgressBar
                        value={Math.round((tally.agre / tally.need) * 100)}
                      />
                      <div className="text-[13.5px] whitespace-nowrap text-n400">
                        정족수 {tally.agre}/{tally.need} 동의
                      </div>
                    </div>
                  )}
                  {subWork.aprvSttsCd === "REJECTED" && rjctRsn && (
                    <div className="mt-2 text-[14px] text-danger">
                      반려 사유 · {rjctRsn}
                    </div>
                  )}
                  {subWork.aprvSttsCd === "PENDING" && (
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => vote(aprv.subWorkAprvId, true)}
                      >
                        동의
                      </Button>
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        onClick={() => vote(aprv.subWorkAprvId, false)}
                      >
                        부동의
                      </Button>
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        onClick={() => setRejectTarget(subWork)}
                      >
                        반려
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          decide(aprv.subWorkAprvId, subWork.subWorkId, true)
                        }
                      >
                        승인
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <RejectSheet
          open={rejectTarget !== null}
          onClose={() => setRejectTarget(null)}
          onReject={(reason) => {
            if (!rejectTarget) return;
            const aprv = subWorkAprvs.find(
              (a) => a.subWorkId === rejectTarget.subWorkId,
            );
            if (aprv) decide(aprv.subWorkAprvId, rejectTarget.subWorkId, false, reason);
          }}
        />
      </PageBody>
    </>
  );
}
