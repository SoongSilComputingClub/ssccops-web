"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore } from "@/entities/form";
import { mbrGrdNm, mbrSttsNm, useMbrStore } from "@/entities/member";
import {
  RSPNS_STTS_BADGE,
  rspnsValueText,
  useRspnsStore,
  type FormRspnsHstry,
} from "@/entities/response";
import { ResponseStatusSheet } from "@/features/form";
import { RSPNS_STTS_CDS } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  type GridColumn,
} from "@/shared/ui";

const ALL = "전체";

export function ResponseListPage({ formId }: { formId: number }) {
  const router = useRouter();
  const form = useFormStore((s) => s.forms.find((f) => f.formId === formId));
  const formRspnsHstrys = useRspnsStore((s) =>
    s.formRspnsHstrys.filter((r) => r.formId === formId),
  );
  const mbrs = useMbrStore((s) => s.mbrs);
  const [tab, setTab] = useState<string>(ALL);
  const [sheetTarget, setSheetTarget] = useState<FormRspnsHstry | null>(null);

  const filtered = formRspnsHstrys.filter(
    (r) => tab === ALL || r.rspnsSttsCd === tab,
  );

  const mbrOf = (r: FormRspnsHstry) =>
    r.mbrId === null ? undefined : mbrs.find((m) => m.mbrId === r.mbrId);

  /**
   * 비회원 응답은 mbr 행이 없으므로 성명·학번·학과를 응답 내용에서 읽는다.
   * (문항 라벨이 아니라 문항 ID 기준)
   */
  const qitemIdBy = (re: RegExp) =>
    form?.qitemCpstCn.qitems.find((q) => re.test(q.qitemLblNm))?.qitemId ?? "";
  const guestNm = (r: FormRspnsHstry) =>
    rspnsValueText(r.rspnsCn, qitemIdBy(/성명|이름/));
  const guestStdntNo = (r: FormRspnsHstry) =>
    rspnsValueText(r.rspnsCn, qitemIdBy(/학번/));
  const guestScsbjtNm = (r: FormRspnsHstry) =>
    rspnsValueText(r.rspnsCn, qitemIdBy(/학과/));

  const columns: GridColumn<FormRspnsHstry>[] = [
    {
      key: "mbrNm",
      header: "회원_명",
      width: "1fr",
      render: (r) => (
        <span
          onClick={() => router.push(ROUTES.responseDetail(formId, r.formRspnsId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {mbrOf(r)?.mbrNm || guestNm(r) || "비회원 응답"}
        </span>
      ),
    },
    {
      key: "stdntNo",
      header: "학생_번호",
      width: ".9fr",
      render: (r) => mbrOf(r)?.stdntNo || guestStdntNo(r) || "비회원",
    },
    {
      key: "meta",
      header: "학과 · 등급 · 상태",
      width: "1.6fr",
      render: (r) => {
        const m = mbrOf(r);
        if (m)
          return `${m.scsbjtNm ?? "-"} · ${mbrGrdNm(m.mbrGrdCd)} · ${mbrSttsNm(m.mbrSttsCd)}`;
        return `${guestScsbjtNm(r) || "-"} · 비회원`;
      },
    },
    {
      key: "sbmsnDt",
      header: "제출_일시",
      width: "1fr",
      render: (r) => formatDt(r.sbmsnDt),
    },
    {
      key: "rspnsSttsCd",
      header: "응답_상태",
      width: "120px",
      render: (r) => {
        const badge = RSPNS_STTS_BADGE[r.rspnsSttsCd];
        return (
          <span onClick={() => setSheetTarget(r)} className="cursor-pointer">
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="응답 목록"
        subtitle={form?.formTtlNm ?? `폼 #${formId}`}
        showBack
      />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[7px]">
          <Chip active={tab === ALL} onClick={() => setTab(ALL)}>
            {ALL}
          </Chip>
          {RSPNS_STTS_CDS.map((cd) => (
            <Chip key={cd} active={tab === cd} onClick={() => setTab(cd)}>
              {RSPNS_STTS_BADGE[cd].label}
            </Chip>
          ))}
          <div className="flex-1" />
          <div className="text-[14px] text-n500">{filtered.length}건</div>
        </div>

        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => String(r.formRspnsId)}
            dense
            empty={<EmptyState message="해당 상태의 응답이 없습니다." />}
          />
        </Card>

        <ResponseStatusSheet
          formRspnsId={sheetTarget?.formRspnsId ?? null}
          current={sheetTarget?.rspnsSttsCd}
          onClose={() => setSheetTarget(null)}
        />
      </PageBody>
    </>
  );
}
