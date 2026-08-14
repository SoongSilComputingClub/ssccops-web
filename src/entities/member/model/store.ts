"use client";

import { create } from "zustand";
import { MBR_GRD_NM, MBR_STTS_NM, type MbrGrdCd, type MbrSttsCd } from "@/shared/config/codes";
import { nextId } from "@/shared/lib/id";
import mbrSeed from "../api/get-mbr.json";
import mbrGrdSeed from "../api/get-mbr-grd.json";
import mbrSttsSeed from "../api/get-mbr-stts.json";
import mbrRoleRelSeed from "../api/get-mbr-role-rel.json";
import mbrGrdHstrySeed from "../api/get-mbr-grd-hstry.json";
import mbrSttsHstrySeed from "../api/get-mbr-stts-hstry.json";
import type {
  Mbr,
  MbrGrd,
  MbrGrdHstry,
  MbrRoleRel,
  MbrStts,
  MbrSttsHstry,
} from "./types";

interface MbrState {
  mbrs: Mbr[];
  mbrGrds: MbrGrd[];
  mbrSttss: MbrStts[];
  mbrRoleRels: MbrRoleRel[];
  mbrGrdHstrys: MbrGrdHstry[];
  mbrSttsHstrys: MbrSttsHstry[];

  updateMbr: (mbrId: number, patch: Partial<Mbr>) => void;
  /** 신규 등록 — 채번된 mbrId 반환 */
  addMbr: (draft: Omit<Mbr, "mbrId" | "crtDt" | "mdfcnDt">) => number;

  addMbrGrdHstry: (entry: Omit<MbrGrdHstry, "mbrGrdHstryId">) => void;
  addMbrSttsHstry: (entry: Omit<MbrSttsHstry, "mbrSttsHstryId">) => void;

  addMbrRoleRel: (mbrId: number, roleId: number, roleBgngYmd: string) => void;
  endMbrRoleRel: (mbrId: number, roleId: number, roleEndYmd: string) => void;
}

export const useMbrStore = create<MbrState>((set) => ({
  mbrs: mbrSeed.data as Mbr[],
  mbrGrds: mbrGrdSeed.data as MbrGrd[],
  mbrSttss: mbrSttsSeed.data as MbrStts[],
  mbrRoleRels: mbrRoleRelSeed.data as MbrRoleRel[],
  mbrGrdHstrys: mbrGrdHstrySeed.data as MbrGrdHstry[],
  mbrSttsHstrys: mbrSttsHstrySeed.data as MbrSttsHstry[],

  updateMbr: (mbrId, patch) =>
    set((s) => ({
      mbrs: s.mbrs.map((m) => (m.mbrId === mbrId ? { ...m, ...patch } : m)),
    })),

  addMbr: (draft) => {
    let mbrId = 0;
    set((s) => {
      mbrId = nextId(s.mbrs, "mbrId");
      const now = `${draft.joinYmd}T09:00:00`;
      return { mbrs: [...s.mbrs, { ...draft, mbrId, crtDt: now, mdfcnDt: now }] };
    });
    return mbrId;
  },

  addMbrGrdHstry: (entry) =>
    set((s) => ({
      mbrGrdHstrys: [
        { ...entry, mbrGrdHstryId: nextId(s.mbrGrdHstrys, "mbrGrdHstryId") },
        ...s.mbrGrdHstrys,
      ],
    })),

  addMbrSttsHstry: (entry) =>
    set((s) => ({
      mbrSttsHstrys: [
        { ...entry, mbrSttsHstryId: nextId(s.mbrSttsHstrys, "mbrSttsHstryId") },
        ...s.mbrSttsHstrys,
      ],
    })),

  addMbrRoleRel: (mbrId, roleId, roleBgngYmd) =>
    set((s) => ({
      mbrRoleRels: [
        ...s.mbrRoleRels,
        {
          mbrRoleId: nextId(s.mbrRoleRels, "mbrRoleId"),
          mbrId,
          roleId,
          roleBgngYmd,
          roleEndYmd: null,
          rprsRoleYn: false,
          crtDt: `${roleBgngYmd}T09:00:00`,
          mdfcnDt: `${roleBgngYmd}T09:00:00`,
        },
      ],
    })),

  endMbrRoleRel: (mbrId, roleId, roleEndYmd) =>
    set((s) => ({
      mbrRoleRels: s.mbrRoleRels.map((r) =>
        r.mbrId === mbrId && r.roleId === roleId && !r.roleEndYmd
          ? { ...r, roleEndYmd, mdfcnDt: `${roleEndYmd}T09:00:00` }
          : r,
      ),
    })),
}));

/* ── 코드 → 표시명 ─────────────────────────────────────────── */

export function mbrGrdNm(cd: MbrGrdCd): string {
  return MBR_GRD_NM[cd];
}

export function mbrSttsNm(cd: MbrSttsCd): string {
  return MBR_STTS_NM[cd];
}

/** 등급 배지 톤: 임시회원=grey, 그 외=blue */
export function mbrGrdTone(cd: MbrGrdCd): "grey" | "blue" {
  return cd === "TEMP" ? "grey" : "blue";
}

/** 상태 배지 톤: 탈퇴·제명=red, 그 외=grey */
export function mbrSttsTone(cd: MbrSttsCd): "red" | "grey" {
  return cd === "WITHDRAWN" || cd === "EXPELLED" ? "red" : "grey";
}

/* ── 파생 ──────────────────────────────────────────────────── */

/** 기수_번호 표기 — "12기" */
export function genNoText(mbr: Mbr): string {
  return mbr.genNo ? `${mbr.genNo}기` : "미배정";
}

/** 졸업생 여부 — 회원_상태_코드에서 파생 */
export function isGraduate(mbr: Mbr): boolean {
  return mbr.mbrSttsCd === "GRADUATED";
}

/** 해당 회원의 현재(종료일 없는) 역할 관계 */
export function currentRoleRels(rels: MbrRoleRel[], mbrId: number): MbrRoleRel[] {
  return rels.filter((r) => r.mbrId === mbrId && !r.roleEndYmd);
}

/** 사이드바 프로필용 대표 역할 관계 — 대표_역할_여부 우선, 없으면 첫 현재 역할 */
export function rprsRoleRel(rels: MbrRoleRel[], mbrId: number): MbrRoleRel | undefined {
  const current = currentRoleRels(rels, mbrId);
  return current.find((r) => r.rprsRoleYn) ?? current[0];
}
