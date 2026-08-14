"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { mtgDtlsOf, mtgSttsTone, prcsSeTone, useMtgStore } from "@/entities/meeting";
import { findOper, useOperStore } from "@/entities/oper";
import { chckPrgrsRt, subWorkSttsBadge, useSubWorkStore } from "@/entities/sub-work";
import { useWorkStore } from "@/entities/work";
import {
  ATND_TRGT_NM,
  MTG_SE_NM,
  MTG_STTS_NM,
  OPER_TYPE_NM,
  PRCS_SE_CDS,
  PRCS_SE_NM,
  PRRTY_RNK_NM,
  WORK_STTS_NM,
  WORK_TYPE_NM,
  type PrcsSeCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

/** 안건으로 연결할 수 있는 운영 건 */
interface OperRef {
  operId: number;
  code: "업무" | "하위 업무";
  ttl: string;
  meta: string;
  open: () => void;
}

export function MeetingDetailPage({ mtgId }: { mtgId: number }) {
  const router = useRouter();
  const { mtgs, mtgDtls, updateMtgDtl, addMtgDtl, removeMtgDtl } = useMtgStore();
  const opers = useOperStore((s) => s.opers);
  const works = useWorkStore((s) => s.works);
  const { subWorks, subWorkChckLists } = useSubWorkStore();
  const mbrs = useMbrStore((s) => s.mbrs);

  const [newOperId, setNewOperId] = useState<number | null>(null);
  const [newPrcsSeCd, setNewPrcsSeCd] = useState<PrcsSeCd>("PENDING");
  const [newAgndCn, setNewAgndCn] = useState("");

  const mtg = mtgs.find((m) => m.mtgId === mtgId);

  if (!mtg) {
    return (
      <>
        <PageHeader title="회의 상세" showBack />
        <PageBody>
          <EmptyState message="회의를 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const oper = findOper(opers, mtg.operId);
  const agenda = mtgDtlsOf(mtgDtls, mtg.mtgId);
  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";

  const operRefs: OperRef[] = [
    ...works.map((w) => ({
      operId: w.operId,
      code: "업무" as const,
      ttl: findOper(opers, w.operId)?.operTtl ?? "-",
      meta: `업무_유형 ${WORK_TYPE_NM[w.workTypeCd]} · 업무_상태 ${WORK_STTS_NM[w.workSttsCd]}`,
      open: () => router.push(ROUTES.workDetail(w.workId)),
    })),
    ...subWorks.map((sw) => ({
      operId: sw.operId,
      code: "하위 업무" as const,
      ttl: sw.subWorkTtl,
      meta: `${subWorkSttsBadge(sw).label} · 진행 ${chckPrgrsRt(subWorkChckLists, sw.subWorkId)}%`,
      open: () => router.push(ROUTES.subWorkDetail(sw.subWorkId)),
    })),
  ];
  const operRefOf = (operId: number | null) =>
    operId === null ? undefined : operRefs.find((o) => o.operId === operId);

  const submitAgenda = () => {
    if (newOperId === null) {
      flash("연결할 운영을 선택하세요");
      return;
    }
    const ref = operRefOf(newOperId);
    addMtgDtl({
      mtgId: mtg.mtgId,
      agndNm: ref?.ttl ?? null,
      prcsSeCd: newPrcsSeCd,
      agndSeq: agenda.length + 1,
      operId: newOperId,
      agndCn: newAgndCn.trim() || null,
      rsltCn: null,
      prsnrId: mtg.mtgRbprsnId,
    });
    flash(`안건을 추가했습니다 · ${ref?.ttl ?? ""}`);
    setNewOperId(null);
    setNewPrcsSeCd("PENDING");
    setNewAgndCn("");
  };

  return (
    <>
      <PageHeader title="회의 상세" subtitle="안건 · 처리 결과" showBack />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.6fr] items-start gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <Badge tone={mtgSttsTone(mtg.mtgSttsCd)}>
                {mtg.mtgSttsCd ? MTG_STTS_NM[mtg.mtgSttsCd] : "-"}
              </Badge>
              <span className="rounded-[6px] bg-bg px-[7px] py-[2px] font-mono text-[12.5px] text-n400">
                운영_ID · {mtg.operId}
              </span>
            </div>
            <div className="mt-2 text-[22px] font-medium">{oper?.operTtl ?? "-"}</div>

            <SectionLabel className="mt-5">상위 속성 · oper</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              labelWidth={88}
              items={[
                {
                  k: "운영_ID",
                  v: <span className="font-mono text-[13.5px]">{mtg.operId}</span>,
                },
                { k: "운영_유형", v: oper ? OPER_TYPE_NM[oper.operTypeCd] : "-" },
                { k: "운영_제목", v: oper?.operTtl ?? "-" },
                { k: "시작_일시", v: formatDt(oper?.bgngDt ?? null) || "-" },
                { k: "우선_순위", v: oper ? PRRTY_RNK_NM[oper.prrtyRnkCd] : "-" },
                { k: "담당자_ID", v: mbrNmOf(oper?.picId) },
              ]}
            />

            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · mtg</SectionLabel>
            <KeyValueGrid
              labelWidth={88}
              items={[
                {
                  k: "회의_ID",
                  v: <span className="font-mono text-[13.5px]">{mtg.mtgId}</span>,
                },
                { k: "회의_구분", v: mtg.mtgSeCd ? MTG_SE_NM[mtg.mtgSeCd] : "-" },
                { k: "회의_장소_명", v: mtg.mtgPlcNm ?? "-" },
                { k: "회의_책임자", v: mbrNmOf(mtg.mtgRbprsnId) },
                {
                  k: "참석_대상",
                  v: mtg.atndTrgtCd ? ATND_TRGT_NM[mtg.atndTrgtCd] : "-",
                },
                { k: "내부_회의_상세", v: mtg.insdMtgDtlCn ?? "-" },
                { k: "외부_회의_상세", v: mtg.otsdMtgDtlCn ?? "-" },
              ]}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">안건</SectionLabel>
              <div className="flex flex-col gap-4">
                {agenda.map((a) => {
                  const ref = operRefOf(a.operId);
                  return (
                    <div
                      key={a.mtgDtlId}
                      className="rounded-[12px] border border-line p-[14px]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-[15px] font-semibold">
                          안건 {a.agndSeq}
                        </div>
                        <span className="font-mono text-[12px] text-n500">
                          회의_상세 #{a.mtgDtlId}
                        </span>
                        <div className="flex-1" />
                        <span className="text-[12.5px] text-n500">
                          제출 {mbrNmOf(a.prsnrId)}
                        </span>
                        {agenda.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              removeMtgDtl(a.mtgDtlId);
                              flash("안건을 삭제했습니다");
                            }}
                            className="cursor-pointer text-[13.5px] text-n400 hover:text-danger"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      {ref ? (
                        <div
                          onClick={ref.open}
                          className="mt-3 cursor-pointer rounded-[10px] bg-bg p-3 transition-opacity hover:opacity-80"
                        >
                          <div className="flex items-center gap-2">
                            <Badge tone={ref.code === "업무" ? "blue" : "grey"}>
                              {ref.code}
                            </Badge>
                            <span className="font-mono text-[12.5px] text-n500">
                              운영 #{ref.operId}
                            </span>
                          </div>
                          <div className="mt-1 text-[15.5px] font-semibold">
                            {ref.ttl}
                          </div>
                          <div className="mt-[2px] text-[13px] text-n500">
                            {ref.meta}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[10px] bg-bg p-3 text-[14px] text-n500">
                          {a.agndNm ?? "제목 없음"} · 연결된 운영 없음
                        </div>
                      )}
                      <div className="mt-3 flex gap-[7px]">
                        {PRCS_SE_CDS.map((cd) => (
                          <Chip
                            key={cd}
                            active={a.prcsSeCd === cd}
                            onClick={() => updateMtgDtl(a.mtgDtlId, { prcsSeCd: cd })}
                          >
                            {PRCS_SE_NM[cd]}
                          </Chip>
                        ))}
                        <div className="flex-1" />
                        <Badge tone={prcsSeTone(a.prcsSeCd)}>
                          {a.prcsSeCd ? PRCS_SE_NM[a.prcsSeCd] : "-"}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <div className="mb-[6px] text-[13.5px] text-n400">안건_내용</div>
                        <TextArea
                          value={a.agndCn ?? ""}
                          onChange={(e) =>
                            updateMtgDtl(a.mtgDtlId, {
                              agndCn: e.target.value || null,
                            })
                          }
                          placeholder="논의할 내용을 작성하세요"
                        />
                      </div>
                      <div className="mt-3">
                        <div className="mb-[6px] text-[13.5px] text-n400">결과_내용</div>
                        <TextField
                          value={a.rsltCn ?? ""}
                          onChange={(e) =>
                            updateMtgDtl(a.mtgDtlId, {
                              rsltCn: e.target.value || null,
                            })
                          }
                          placeholder="예: 원안 가결"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-[18px]">
              <div className="text-[16px] font-medium">안건 추가</div>
              <div className="mt-1 text-[13.5px] text-n500">
                안건으로 올릴 운영을 선택하고 내용을 작성하세요.
              </div>
              <div className="mt-3 flex max-h-[260px] flex-col gap-2 overflow-y-auto">
                {operRefs.map((ref) => (
                  <div
                    key={ref.operId}
                    onClick={() => setNewOperId(ref.operId)}
                    className={
                      newOperId === ref.operId
                        ? "cursor-pointer rounded-[10px] bg-accent/8 p-3 shadow-[inset_0_0_0_1px_#3182f6]"
                        : "cursor-pointer rounded-[10px] border border-line p-3 hover:border-accent"
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Badge tone={ref.code === "업무" ? "blue" : "grey"}>
                        {ref.code}
                      </Badge>
                      <span className="font-mono text-[12.5px] text-n500">
                        운영 #{ref.operId}
                      </span>
                    </div>
                    <div className="mt-1 text-[15px] font-semibold">{ref.ttl}</div>
                    <div className="mt-[2px] text-[13px] text-n500">{ref.meta}</div>
                  </div>
                ))}
              </div>
              {newOperId !== null && (
                <div className="mt-3 text-[13.5px] text-accent">
                  선택됨 {operRefOf(newOperId)?.ttl} · 운영 #{newOperId}
                </div>
              )}
              <div className="mt-3 flex gap-[7px]">
                {PRCS_SE_CDS.map((cd) => (
                  <Chip
                    key={cd}
                    active={newPrcsSeCd === cd}
                    onClick={() => setNewPrcsSeCd(cd)}
                  >
                    {PRCS_SE_NM[cd]}
                  </Chip>
                ))}
              </div>
              <TextArea
                value={newAgndCn}
                onChange={(e) => setNewAgndCn(e.target.value)}
                placeholder="안건_내용 (선택)"
                className="mt-3"
              />
              <Button className="mt-3" onClick={submitAgenda}>
                안건 추가
              </Button>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
