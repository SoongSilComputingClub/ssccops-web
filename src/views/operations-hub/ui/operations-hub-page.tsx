"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { mtgDtlsOf, mtgSttsTone, useMtgStore } from "@/entities/meeting";
import { findOper, useOperStore } from "@/entities/oper";
import {
  chckPrgrsRt,
  ownerMbrId,
  subWorkSttsBadge,
  useSubWorkStore,
} from "@/entities/sub-work";
import { useWorkStore, workSttsTone } from "@/entities/work";
import {
  APRV_STTS_NM,
  MTG_SE_NM,
  MTG_STTS_NM,
  OPER_TYPE_NM,
  WORK_STTS_NM,
  WORK_TYPE_NM,
  type OperTypeCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatMd } from "@/shared/lib/date";
import { Badge, Card, Chip, PageBody, PageHeader, SectionLabel } from "@/shared/ui";

const KIND_TABS: ("전체" | OperTypeCd)[] = ["전체", "WORK", "SUB_WORK", "MEETING"];

interface OperRow {
  operTypeCd: OperTypeCd;
  operId: number;
  ttl: string;
  date: string;
  pic: string;
  ext: string;
  href: string;
}

const kindTone = (cd: OperTypeCd) =>
  cd === "WORK" ? "blue" : cd === "MEETING" ? "amber" : "grey";

export function OperationsHubPage() {
  const router = useRouter();
  const works = useWorkStore((s) => s.works);
  const { subWorks, subWorkChckLists, subWorkPicAltmnts } = useSubWorkStore();
  const { mtgs, mtgDtls } = useMtgStore();
  const opers = useOperStore((s) => s.opers);
  const mbrs = useMbrStore((s) => s.mbrs);
  const [tab, setTab] = useState<"전체" | OperTypeCd>("전체");

  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";
  const ttlOf = (operId: number) => findOper(opers, operId)?.operTtl ?? "-";

  const rows: OperRow[] = [
    ...works.map<OperRow>((w) => {
      const oper = findOper(opers, w.operId);
      return {
        operTypeCd: "WORK",
        operId: w.operId,
        ttl: ttlOf(w.operId),
        date: `${formatMd(oper?.bgngDt ?? null)} ~`,
        pic: mbrNmOf(oper?.picId),
        ext: `업무_유형 ${WORK_TYPE_NM[w.workTypeCd]} · 업무_상태 ${WORK_STTS_NM[w.workSttsCd]} · 하위 ${
          subWorks.filter((sw) => sw.workId === w.workId).length
        }건`,
        href: ROUTES.workDetail(w.workId),
      };
    }),
    ...subWorks.map<OperRow>((sw) => ({
      operTypeCd: "SUB_WORK",
      operId: sw.operId,
      ttl: sw.subWorkTtl,
      date: formatMd(sw.ddlnDt) || "-",
      pic: mbrNmOf(ownerMbrId(subWorkPicAltmnts, sw.subWorkId)),
      ext: `업무_상태 ${WORK_STTS_NM[sw.workSttsCd]} · 승인 ${APRV_STTS_NM[sw.aprvSttsCd]} · 진행 ${chckPrgrsRt(
        subWorkChckLists,
        sw.subWorkId,
      )}%`,
      href: ROUTES.subWorkDetail(sw.subWorkId),
    })),
    ...mtgs.map<OperRow>((m) => {
      const oper = findOper(opers, m.operId);
      return {
        operTypeCd: "MEETING",
        operId: m.operId,
        ttl: ttlOf(m.operId),
        date: formatDt(oper?.bgngDt ?? null),
        pic: mbrNmOf(m.mtgRbprsnId),
        ext: `회의_구분 ${m.mtgSeCd ? MTG_SE_NM[m.mtgSeCd] : "-"} · 회의_상태 ${
          m.mtgSttsCd ? MTG_STTS_NM[m.mtgSttsCd] : "-"
        } · 안건 ${mtgDtlsOf(mtgDtls, m.mtgId).length}건`,
        href: ROUTES.meetingDetail(m.mtgId),
      };
    }),
  ];
  const filtered = rows.filter((r) => tab === "전체" || r.operTypeCd === tab);

  const kindCards = [
    {
      cd: "WORK" as const,
      table: "work",
      count: works.length,
      note: "행사·상시·정례 운영 단위. 업무_유형·업무_상태·총평_내용·업무_진행_률 보유",
      href: ROUTES.works,
    },
    {
      cd: "SUB_WORK" as const,
      table: "sub_work",
      count: subWorks.length,
      note: "실제 실행 단위. 상태 전이·승인·점검 목록의 대상",
      href: ROUTES.subWorks,
    },
    {
      cd: "MEETING" as const,
      table: "mtg",
      count: mtgs.length,
      note: "정례·주제 회의. 안건(mtg_dtl)과 결과_내용을 기록",
      href: ROUTES.meetings,
    },
  ];

  return (
    <>
      <PageHeader title="운영 통합" subtitle="oper · work · sub_work · mtg" />
      <PageBody>
        <p className="mb-4 max-w-[760px] text-[15px] text-n400">
          상위 테이블 oper 를 WORK · SUB_WORK · MEETING 세 유형이 참조합니다.
          제목·담당자·우선순위·기간은 oper 가 보유하고, 아래 확장 속성만 유형별로
          다릅니다.
        </p>

        <div className="grid grid-cols-3 gap-[14px]">
          {kindCards.map((k) => (
            <Card key={k.cd} onClick={() => router.push(k.href)}>
              <div className="flex items-center gap-2">
                <Badge tone={kindTone(k.cd)}>{OPER_TYPE_NM[k.cd]}</Badge>
                <span className="font-mono text-[12.5px] text-n500">{k.table}</span>
                <div className="flex-1" />
                <div className="text-[14px] text-accent">{k.count}건</div>
              </div>
              <div className="mt-2 text-[13.5px] leading-[1.5] text-n400">{k.note}</div>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[1.5fr_1fr] items-start gap-4">
          <Card>
            <div className="mb-[14px] flex items-center gap-[7px]">
              {KIND_TABS.map((t) => (
                <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                  {t === "전체" ? "전체" : OPER_TYPE_NM[t]}
                </Chip>
              ))}
              <div className="flex-1" />
              <div className="text-[13.5px] text-n500">
                {filtered.length}건 · 전체 {rows.length}건
              </div>
            </div>
            <div className="grid grid-cols-[.9fr_2fr_1.1fr_.9fr]">
              {["운영_유형", "제목", "일시", "담당자"].map((h) => (
                <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                  {h}
                </div>
              ))}
              {filtered.map((r) => (
                <div key={`${r.operTypeCd}-${r.operId}`} className="contents">
                  <div className="border-t border-black/5 py-3">
                    <Badge tone={kindTone(r.operTypeCd)}>
                      {OPER_TYPE_NM[r.operTypeCd]}
                    </Badge>
                  </div>
                  <div
                    onClick={() => router.push(r.href)}
                    className="min-w-0 cursor-pointer border-t border-black/5 py-3 pr-3"
                  >
                    <div className="truncate text-[15px] font-semibold hover:text-accent">
                      {r.ttl}
                    </div>
                    <div className="mt-[2px] truncate text-[13.5px] text-n500">
                      {r.ext}
                    </div>
                  </div>
                  <div className="border-t border-black/5 py-3 text-[14px] text-n400">
                    {r.date}
                  </div>
                  <div className="border-t border-black/5 py-3 text-[14px] text-n400">
                    {r.pic}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">상속 구조</SectionLabel>
            <div className="flex flex-col gap-3">
              {works.map((w) => (
                <div key={w.workId}>
                  <div
                    onClick={() => router.push(ROUTES.workDetail(w.workId))}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Badge tone={workSttsTone(w.workSttsCd)}>
                      {WORK_STTS_NM[w.workSttsCd]}
                    </Badge>
                    <div className="text-[15px] font-semibold hover:text-accent">
                      {ttlOf(w.operId)}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-2 border-l border-line pl-[14px]">
                    {subWorks
                      .filter((sw) => sw.workId === w.workId)
                      .map((sw) => {
                        const badge = subWorkSttsBadge(sw);
                        return (
                          <div
                            key={sw.subWorkId}
                            onClick={() =>
                              router.push(ROUTES.subWorkDetail(sw.subWorkId))
                            }
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                            <div className="min-w-0 truncate text-[14px] hover:text-accent">
                              {sw.subWorkTtl}
                            </div>
                            <div className="flex-none text-[12.5px] text-n500">
                              {WORK_STTS_NM[sw.workSttsCd]} ·{" "}
                              {chckPrgrsRt(subWorkChckLists, sw.subWorkId)}%
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}

              <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />
              <SectionLabel>회의</SectionLabel>
              {mtgs.map((m) => (
                <div
                  key={m.mtgId}
                  onClick={() => router.push(ROUTES.meetingDetail(m.mtgId))}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Badge tone={mtgSttsTone(m.mtgSttsCd)}>
                    {m.mtgSttsCd ? MTG_STTS_NM[m.mtgSttsCd] : "-"}
                  </Badge>
                  <div className="min-w-0 truncate text-[14px] hover:text-accent">
                    {ttlOf(m.operId)}
                  </div>
                  <div className="flex-none text-[12.5px] text-n500">
                    {formatDt(findOper(opers, m.operId)?.bgngDt ?? null)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
