"use client";

import { useState } from "react";
import { aprvOf, rjctRsnOf, useAprvStore } from "@/entities/approval";
import { useMbrStore } from "@/entities/member";
import { findOper, useOperStore } from "@/entities/oper";
import {
  chckListOf,
  collabMbrIds,
  completedPatch,
  ownerMbrId,
  useSubWorkStore,
} from "@/entities/sub-work";
import {
  findSubWorkType,
  subWorkTypeNm,
  subWorkTypeTone,
  useSubWorkTypeStore,
} from "@/entities/sub-work-type";
import { useWorkStore } from "@/entities/work";
import { RejectSheet, useApprovalActions } from "@/features/approval";
import {
  OPER_TYPE_NM,
  PRRTY_RNK_NM,
  WORK_STTS_CDS,
  WORK_STTS_NM,
  workSttsStep,
} from "@/shared/config/codes";
import { ddayText, deadlineFlag, formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  CircleStepper,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  flash,
} from "@/shared/ui";

const STAGE_LABELS = WORK_STTS_CDS.map((cd) => WORK_STTS_NM[cd]);

export function SubWorkDetailPage({ subWorkId }: { subWorkId: number }) {
  const { subWorks, subWorkChckLists, subWorkPicAltmnts } = useSubWorkStore();
  const toggleChckArtcl = useSubWorkStore((s) => s.toggleChckArtcl);
  const updateSubWork = useSubWorkStore((s) => s.updateSubWork);
  const works = useWorkStore((s) => s.works);
  const opers = useOperStore((s) => s.opers);
  const mbrs = useMbrStore((s) => s.mbrs);
  const subWorkTypes = useSubWorkTypeStore((s) => s.subWorkTypes);
  const { subWorkAprvs, subWorkRjcts } = useAprvStore();
  const { decide, rejectSubWork } = useApprovalActions();
  const [rejectOpen, setRejectOpen] = useState(false);

  const subWork = subWorks.find((sw) => sw.subWorkId === subWorkId);

  if (!subWork) {
    return (
      <>
        <PageHeader title="하위 업무 상세" showBack />
        <PageBody>
          <EmptyState message="하위 업무를 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const oper = findOper(opers, subWork.operId);
  const parentWork = works.find((w) => w.workId === subWork.workId);
  const parentTtl = parentWork
    ? findOper(opers, parentWork.operId)?.operTtl
    : undefined;
  const subWorkType = findSubWorkType(subWorkTypes, subWork.subWorkTypeId);
  const aprv = aprvOf(subWorkAprvs, subWork.subWorkId);
  const rjctRsn = rjctRsnOf(subWorkRjcts, subWork.subWorkId);

  const chckList = chckListOf(subWorkChckLists, subWork.subWorkId);
  const doneCnt = chckList.filter((c) => c.cmptnYn).length;

  const pending = subWork.aprvSttsCd === "PENDING";
  const canRequest =
    !pending && subWork.workSttsCd !== "DONE" && subWorkType?.aprvNeedYn === true;
  const flag = deadlineFlag(subWork.ddlnDt, subWork.dlyYn);

  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";
  const ownerId = ownerMbrId(subWorkPicAltmnts, subWork.subWorkId);
  const collabNms = collabMbrIds(subWorkPicAltmnts, subWork.subWorkId)
    .map(mbrNmOf)
    .join(", ");

  const approve = () => {
    if (aprv) {
      decide(aprv.subWorkAprvId, subWork.subWorkId, true);
    } else {
      updateSubWork(subWork.subWorkId, {
        aprvSttsCd: "APPROVED",
        ...completedPatch(),
      });
      flash("완료 승인했습니다");
    }
  };

  const requestApproval = () => {
    updateSubWork(subWork.subWorkId, {
      aprvSttsCd: "PENDING",
      workSttsCd: "REVIEW",
    });
    flash("완료 승인을 요청했습니다");
  };

  return (
    <>
      <PageHeader title="하위 업무 상세" subtitle="상태 · 점검 목록 · 승인" showBack />
      <PageBody>
        <Card className="mb-4">
          <div className="flex items-center gap-[10px]">
            <div className="text-[24px] font-medium">{subWork.subWorkTtl}</div>
            <Badge tone={subWorkTypeTone(subWorkType)}>
              {subWorkTypeNm(subWorkTypes, subWork.subWorkTypeId)}
            </Badge>
            {pending && <Badge tone="amber">승인 대기</Badge>}
            <div className="flex-1" />
            {pending ? (
              <div className="flex gap-[9px]">
                <Button variant="ghost-danger" onClick={() => setRejectOpen(true)}>
                  반려
                </Button>
                <Button onClick={approve}>완료 승인</Button>
              </div>
            ) : (
              canRequest && <Button onClick={requestApproval}>완료 승인 요청</Button>
            )}
          </div>
          <CircleStepper
            steps={STAGE_LABELS}
            current={workSttsStep(subWork.workSttsCd)}
            className="mt-[22px]"
          />
          <div className="mt-[14px] text-center text-[13.5px] text-n400">
            {subWorkType?.aprvNeedYn
              ? `완료 전환은 ${subWorkType.autzrRoleCd ? "승인자" : "책임자"} 승인이 필요합니다.`
              : "승인이 필요하지 않은 유형입니다."}
          </div>
        </Card>

        <div className="grid grid-cols-2 items-start gap-4">
          <Card>
            <SectionLabel>상위 속성 · oper</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              items={[
                {
                  k: "운영_ID",
                  v: <span className="font-mono text-[13.5px]">{subWork.operId}</span>,
                },
                { k: "운영_유형", v: oper ? OPER_TYPE_NM[oper.operTypeCd] : "-" },
                { k: "운영_제목", v: oper?.operTtl ?? "-" },
                { k: "우선_순위", v: oper ? PRRTY_RNK_NM[oper.prrtyRnkCd] : "-" },
                { k: "담당자_ID", v: mbrNmOf(oper?.picId) },
                {
                  k: "상위 업무",
                  v: parentTtl ?? <Badge tone="red">미연결</Badge>,
                },
              ]}
            />
            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · sub_work</SectionLabel>
            <KeyValueGrid
              items={[
                {
                  k: "하위_업무_ID",
                  v: <span className="font-mono text-[13.5px]">{subWork.subWorkId}</span>,
                },
                { k: "담당자", v: mbrNmOf(ownerId) },
                { k: "협업자", v: collabNms || "-" },
                {
                  k: "마감_일시",
                  v: (
                    <span className="flex items-center gap-2">
                      {formatDt(subWork.ddlnDt) || "-"} ({ddayText(subWork.ddlnDt)})
                      {flag && (
                        <Badge tone={flag === "지연" ? "red" : "outline-accent"}>
                          {flag}
                        </Badge>
                      )}
                    </span>
                  ),
                },
                { k: "업무_상태", v: WORK_STTS_NM[subWork.workSttsCd] },
                { k: "업무_내용", v: subWork.workCn || "-" },
                { k: "완료_기준_내용", v: subWork.cmptnCrtrCn || "-" },
              ]}
            />
            {subWork.otsdUrlAddr && (
              <a
                href={subWork.otsdUrlAddr}
                target="_blank"
                rel="noreferrer"
                className="mt-[14px] block truncate text-[14.5px] text-accent"
              >
                {subWork.otsdUrlAddr} ↗
              </a>
            )}
            {rjctRsn && (
              <div className="mt-3 text-[14px] text-danger">반려 사유 · {rjctRsn}</div>
            )}
          </Card>

          <Card>
            <SectionLabel className="mb-[14px]">완료 점검 목록</SectionLabel>
            <div className="flex flex-col gap-[13px]">
              {chckList.map((c) => (
                <div
                  key={c.subWorkChckListId}
                  onClick={() => toggleChckArtcl(c.subWorkChckListId)}
                  className="flex cursor-pointer items-center gap-[11px]"
                >
                  <div
                    className={
                      c.cmptnYn
                        ? "flex size-[18px] flex-none items-center justify-center rounded-[6px] bg-accent-strong text-[11px] text-white"
                        : "size-[18px] flex-none rounded-[6px] shadow-[inset_0_0_0_1px_#d1d6db]"
                    }
                  >
                    {c.cmptnYn ? "✓" : ""}
                  </div>
                  <div
                    className={c.cmptnYn ? "text-[15.5px] text-n400" : "text-[15.5px]"}
                  >
                    {c.chckArtclCn}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[14px] text-n500">
              {doneCnt}/{chckList.length} 완료
            </div>
          </Card>
        </div>

        <RejectSheet
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          onReject={(reason) => rejectSubWork(subWork.subWorkId, reason)}
        />
      </PageBody>
    </>
  );
}
