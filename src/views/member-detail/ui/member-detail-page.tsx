"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  genNoText,
  mbrGrdNm,
  mbrGrdTone,
  mbrSttsNm,
  mbrSttsTone,
  useMbrStore,
} from "@/entities/member";
import { roleNmOf, useRoleStore } from "@/entities/role";
import { GradeStatusSheet, RoleSheet, useMemberActions } from "@/features/member";
import { MBR_GRD_NM, MBR_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
} from "@/shared/ui";

export function MemberDetailPage({ mbrId }: { mbrId: number }) {
  const router = useRouter();
  const mbrs = useMbrStore((s) => s.mbrs);
  const mbr = mbrs.find((m) => m.mbrId === mbrId);
  const mbrRoleRels = useMbrStore((s) => s.mbrRoleRels);
  const mbrGrdHstrys = useMbrStore((s) => s.mbrGrdHstrys);
  const mbrSttsHstrys = useMbrStore((s) => s.mbrSttsHstrys);
  const roles = useRoleStore((s) => s.roles);
  const { endRole } = useMemberActions();
  const [sheet, setSheet] = useState<"grd" | "stts" | null>(null);
  const [roleSheet, setRoleSheet] = useState(false);

  if (!mbr) {
    return (
      <>
        <PageHeader title="회원 상세" showBack />
        <PageBody>
          <EmptyState message="회원을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const myRoleRels = mbrRoleRels.filter((r) => r.mbrId === mbr.mbrId);

  /** 등급·상태 이력을 시간 역순으로 합쳐 최근 3건 */
  const hstry = [
    ...mbrGrdHstrys
      .filter((h) => h.mbrId === mbr.mbrId)
      .map((h) => ({
        key: `grd-${h.mbrGrdHstryId}`,
        kind: "등급",
        from: h.bfrMbrGrdCd ? MBR_GRD_NM[h.bfrMbrGrdCd] : "-",
        to: MBR_GRD_NM[h.aftrMbrGrdCd],
        at: h.crtDt,
        chnrgMbrId: h.chnrgMbrId,
      })),
    ...mbrSttsHstrys
      .filter((h) => h.mbrId === mbr.mbrId)
      .map((h) => ({
        key: `stts-${h.mbrSttsHstryId}`,
        kind: "상태",
        from: h.bfrMbrSttsCd ? MBR_STTS_NM[h.bfrMbrSttsCd] : "-",
        to: MBR_STTS_NM[h.aftrMbrSttsCd],
        at: h.crtDt,
        chnrgMbrId: h.chnrgMbrId,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3);

  const mbrNmOf = (id: number | null) =>
    mbrs.find((m) => m.mbrId === id)?.mbrNm ?? "-";

  return (
    <>
      <PageHeader title="회원 상세" subtitle={`회원 #${mbr.mbrId}`} showBack />
      <PageBody>
        <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center gap-[10px]">
                <div className="text-[26px] font-medium">{mbr.mbrNm}</div>
                <Badge tone={mbrGrdTone(mbr.mbrGrdCd)}>{mbrGrdNm(mbr.mbrGrdCd)}</Badge>
                <Badge tone={mbrSttsTone(mbr.mbrSttsCd)}>
                  {mbrSttsNm(mbr.mbrSttsCd)}
                </Badge>
                <div className="flex-1" />
                <Button onClick={() => router.push(ROUTES.memberEdit(mbr.mbrId))}>
                  회원정보 수정
                </Button>
              </div>
              <div className="mt-1 text-[13.5px] text-n500">
                회원 #{mbr.mbrId} · 가입 {mbr.joinYmd}
              </div>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
              <div className="grid grid-cols-[84px_1fr_84px_1fr] gap-y-[9px] text-[15px]">
                <div className="text-[14px] text-n500">학생번호</div>
                <div>{mbr.stdntNo || "학번 미확인"}</div>
                <div className="text-[14px] text-n500">기수</div>
                <div>{genNoText(mbr)}</div>
                <div className="text-[14px] text-n500">학과</div>
                <div>{mbr.scsbjtNm || "학과 미입력"}</div>
                <div className="text-[14px] text-n500">학년</div>
                <div>{mbr.scyrNo ? `${mbr.scyrNo}학년` : "학년 미입력"}</div>
                <div className="text-[14px] text-n500">연락처</div>
                <div>{mbr.telno || "미입력"}</div>
                <div className="text-[14px] text-n500">이메일</div>
                <div>{mbr.eml || "미입력"}</div>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">등급 · 상태</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {(["grd", "stts"] as const).map((kind) => (
                  <div
                    key={kind}
                    onClick={() => setSheet(kind)}
                    className="cursor-pointer rounded-[12px] border border-line p-[14px] transition-colors hover:border-accent"
                  >
                    <div className="text-[13px] text-n500">
                      {kind === "grd" ? "회원등급" : "회원상태"}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <div className="text-[19px] font-medium">
                        {kind === "grd"
                          ? mbrGrdNm(mbr.mbrGrdCd)
                          : mbrSttsNm(mbr.mbrSttsCd)}
                      </div>
                      <div className="flex-1" />
                      <div className="text-[14px] text-accent">변경 ›</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <div className="mb-3 flex items-center">
                <SectionLabel>현재 역할</SectionLabel>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setRoleSheet(true)}
                  className="cursor-pointer text-[14px] text-accent"
                >
                  + 역할 추가
                </button>
              </div>
              {myRoleRels.length === 0 ? (
                <EmptyState message="부여된 역할이 없습니다." padding="sm" />
              ) : (
                <div className="flex flex-col gap-[9px]">
                  {myRoleRels.map((r) => (
                    <div
                      key={r.mbrRoleId}
                      className="rounded-[12px] border border-line p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-[16px] font-medium">
                          {roleNmOf(roles, r.roleId)}
                        </div>
                        {r.rprsRoleYn && <Pill tone="blue">대표</Pill>}
                        <div className="flex-1" />
                        {!r.roleEndYmd && (
                          <button
                            type="button"
                            onClick={() => endRole(mbr, r.roleId)}
                            className="cursor-pointer text-[13.5px] text-n400 hover:text-danger"
                          >
                            종료
                          </button>
                        )}
                      </div>
                      <div className="mt-1 text-[13.5px] text-n500">
                        {r.roleBgngYmd} ~ {r.roleEndYmd || "진행중"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionLabel className="mb-3">최근 변경이력</SectionLabel>
              {hstry.length === 0 ? (
                <div className="text-[14.5px] text-n500">변경 이력이 없습니다</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {hstry.map((h) => (
                    <div key={h.key} className="flex items-start gap-[10px]">
                      <div className="mt-[7px] size-[5px] flex-none rounded-full bg-accent" />
                      <div className="min-w-0">
                        <div className="text-[14.5px]">
                          {h.kind} · {h.from} → {h.to}
                        </div>
                        <div className="mt-[2px] text-[12.5px] text-n500">
                          {formatDt(h.at)} · {mbrNmOf(h.chnrgMbrId)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <GradeStatusSheet mbr={mbr} kind={sheet} onClose={() => setSheet(null)} />
        <RoleSheet mbr={mbr} open={roleSheet} onClose={() => setRoleSheet(false)} />
      </PageBody>
    </>
  );
}
