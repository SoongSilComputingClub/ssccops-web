"use client";

import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { useMbrStore, type Mbr } from "@/entities/member";
import { useRoleStore } from "@/entities/role";
import { useSessionStore } from "@/entities/session";
import { TODAY } from "@/shared/config/constants";
import { flash } from "@/shared/ui";

const NOW = `${TODAY}T10:00:00`;

/** 회원 등급/상태/역할 변경 — 스토어 갱신 + 이력 기록 + 토스트 */
export function useMemberActions() {
  const updateMbr = useMbrStore((s) => s.updateMbr);
  const addMbrGrdHstry = useMbrStore((s) => s.addMbrGrdHstry);
  const addMbrSttsHstry = useMbrStore((s) => s.addMbrSttsHstry);
  const addMbrRoleRel = useMbrStore((s) => s.addMbrRoleRel);
  const endMbrRoleRel = useMbrStore((s) => s.endMbrRoleRel);
  const roles = useRoleStore((s) => s.roles);
  const chnrgMbrId = useSessionStore((s) => s.mbrId);

  const changeMbrGrd = (mbr: Mbr, aftrMbrGrdCd: MbrGrdCd, grdChgRsnCn: string) => {
    updateMbr(mbr.mbrId, { mbrGrdCd: aftrMbrGrdCd, mdfcnDt: NOW });
    addMbrGrdHstry({
      mbrId: mbr.mbrId,
      bfrMbrGrdCd: mbr.mbrGrdCd,
      aftrMbrGrdCd,
      grdAplcnYmd: TODAY,
      grdChgRsnCn: grdChgRsnCn || "사유 미기재",
      chnrgMbrId: chnrgMbrId || null,
      crtDt: NOW,
    });
    flash("등급이 변경되었습니다");
  };

  const changeMbrStts = (mbr: Mbr, aftrMbrSttsCd: MbrSttsCd, sttsChgRsnCn: string) => {
    updateMbr(mbr.mbrId, { mbrSttsCd: aftrMbrSttsCd, mdfcnDt: NOW });
    addMbrSttsHstry({
      mbrId: mbr.mbrId,
      bfrMbrSttsCd: mbr.mbrSttsCd,
      aftrMbrSttsCd,
      sttsAplcnYmd: TODAY,
      sttsEndPrnmntYmd: null,
      sttsChgRsnCn: sttsChgRsnCn || "사유 미기재",
      chnrgMbrId: chnrgMbrId || null,
      crtDt: NOW,
    });
    flash("상태가 변경되었습니다");
  };

  const assignRole = (mbr: Mbr, roleId: number) => {
    addMbrRoleRel(mbr.mbrId, roleId, TODAY);
    const roleNm = roles.find((r) => r.roleId === roleId)?.roleNm ?? "역할";
    flash(`${roleNm} 역할을 부여했습니다`);
  };

  const endRole = (mbr: Mbr, roleId: number) => {
    endMbrRoleRel(mbr.mbrId, roleId, TODAY);
    const roleNm = roles.find((r) => r.roleId === roleId)?.roleNm ?? "역할";
    flash(`${roleNm} 역할을 종료했습니다`);
  };

  return { changeMbrGrd, changeMbrStts, assignRole, endRole };
}
