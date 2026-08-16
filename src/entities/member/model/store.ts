"use client";

import { create } from "zustand";
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
