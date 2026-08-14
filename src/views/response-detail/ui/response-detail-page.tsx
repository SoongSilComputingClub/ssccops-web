"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore } from "@/entities/form";
import { genNoText, mbrGrdNm, mbrSttsNm, useMbrStore } from "@/entities/member";
import {
  RSPNS_STTS_BADGE,
  rspnsValueText,
  useRspnsStore,
} from "@/entities/response";
import { ResponseStatusSheet } from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  flash,
} from "@/shared/ui";

export function ResponseDetailPage({
  formId,
  formRspnsId,
}: {
  formId: number;
  formRspnsId: number;
}) {
  const router = useRouter();
  const form = useFormStore((s) => s.forms.find((f) => f.formId === formId));
  const rows = useRspnsStore((s) =>
    s.formRspnsHstrys.filter((r) => r.formId === formId),
  );
  const mbrs = useMbrStore((s) => s.mbrs);
  const [sheetOpen, setSheetOpen] = useState(false);

  const idx = rows.findIndex((r) => r.formRspnsId === formRspnsId);
  const rspns = rows[idx];

  if (!form || !rspns) {
    return (
      <>
        <PageHeader title="응답 상세" showBack />
        <PageBody>
          <EmptyState message="응답을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const mbr =
    rspns.mbrId === null ? undefined : mbrs.find((m) => m.mbrId === rspns.mbrId);
  const badge = RSPNS_STTS_BADGE[rspns.rspnsSttsCd];

  /** 비회원 응답의 식별 정보는 응답 내용(rspnsCn)에서 읽는다 */
  const qitemIdBy = (re: RegExp) =>
    form.qitemCpstCn.qitems.find((q) => re.test(q.qitemLblNm))?.qitemId ?? "";
  const fromRspns = (re: RegExp) => rspnsValueText(rspns.rspnsCn, qitemIdBy(re));

  const mbrNm = mbr?.mbrNm || fromRspns(/성명|이름/) || "비회원 응답";

  const go = (dir: -1 | 1) => {
    const next = rows[Math.min(rows.length - 1, Math.max(0, idx + dir))];
    if (next && next.formRspnsId !== rspns.formRspnsId)
      router.replace(ROUTES.responseDetail(formId, next.formRspnsId));
  };

  return (
    <>
      <PageHeader title="응답 상세" subtitle={`${idx + 1} / ${rows.length}`} showBack />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.2fr] items-start gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <div className="text-[23px] font-medium">{mbrNm}</div>
              <div className="flex-1" />
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <div className="mt-1 text-[13px] text-n500">
              회원 정보는 mbr 에서 조회 · 응답에 중복 저장하지 않음
            </div>
            <KeyValueGrid
              className="mt-4"
              items={[
                { k: "회원_ID", v: mbr ? String(mbr.mbrId) : "비회원" },
                { k: "학생_번호", v: mbr?.stdntNo || fromRspns(/학번/) || "-" },
                { k: "기수_번호", v: mbr ? genNoText(mbr) : "-" },
                { k: "학과_명", v: mbr?.scsbjtNm || fromRspns(/학과/) || "-" },
                { k: "학년_번호", v: mbr?.scyrNo ? `${mbr.scyrNo}학년` : "-" },
                { k: "전화번호", v: mbr?.telno || fromRspns(/연락처|전화/) || "-" },
                { k: "회원_등급", v: mbr ? mbrGrdNm(mbr.mbrGrdCd) : "-" },
                { k: "회원_상태", v: mbr ? mbrSttsNm(mbr.mbrSttsCd) : "-" },
                { k: "제출_일시", v: formatDt(rspns.sbmsnDt) },
              ]}
            />
            <button
              type="button"
              onClick={() => {
                if (mbr) router.push(ROUTES.memberDetail(mbr.mbrId));
                else flash("비회원 응답입니다");
              }}
              className="mt-4 cursor-pointer text-[14px] text-accent"
            >
              회원 상세로 이동 ›
            </button>
          </Card>

          <Card>
            <SectionLabel className="mb-3">응답_내용</SectionLabel>
            <div className="flex flex-col gap-3">
              {form.qitemCpstCn.qitems.map((q) => {
                const v = rspnsValueText(rspns.rspnsCn, q.qitemId);
                return (
                  <div key={q.qitemId}>
                    <div className="text-[13.5px] text-n500">
                      {q.qitemLblNm}
                      <span className="ml-1 font-mono text-[12px]">({q.qitemId})</span>
                    </div>
                    <div className="mt-[2px] text-[16px]">
                      {v || <span className="text-n500">(응답 없음)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" disabled={idx === 0} onClick={() => go(-1)}>
            이전
          </Button>
          <Button onClick={() => setSheetOpen(true)}>응답 상태 변경</Button>
          <Button
            variant="ghost"
            disabled={idx >= rows.length - 1}
            onClick={() => go(1)}
          >
            다음
          </Button>
        </div>

        <ResponseStatusSheet
          formRspnsId={sheetOpen ? rspns.formRspnsId : null}
          current={rspns.rspnsSttsCd}
          onClose={() => setSheetOpen(false)}
        />
      </PageBody>
    </>
  );
}
