"use client";

import { create } from "zustand";
import type { MtgSttsCd, PrcsSeCd } from "@/shared/config/codes";
import { nextId } from "@/shared/lib/id";
import mtgSeed from "../api/get-mtg.json";
import mtgDtlSeed from "../api/get-mtg-dtl.json";
import type { Mtg, MtgDtl } from "./types";

interface MtgState {
  mtgs: Mtg[];
  mtgDtls: MtgDtl[];

  addMtg: (draft: Omit<Mtg, "mtgId">) => number;
  updateMtg: (mtgId: number, patch: Partial<Mtg>) => void;
  addMtgDtl: (draft: Omit<MtgDtl, "mtgDtlId">) => void;
  updateMtgDtl: (mtgDtlId: number, patch: Partial<MtgDtl>) => void;
  removeMtgDtl: (mtgDtlId: number) => void;
}

export const useMtgStore = create<MtgState>((set) => ({
  mtgs: mtgSeed.data as Mtg[],
  mtgDtls: mtgDtlSeed.data as MtgDtl[],

  addMtg: (draft) => {
    let mtgId = 0;
    set((s) => {
      mtgId = nextId(s.mtgs, "mtgId");
      return { mtgs: [...s.mtgs, { ...draft, mtgId }] };
    });
    return mtgId;
  },

  updateMtg: (mtgId, patch) =>
    set((s) => ({ mtgs: s.mtgs.map((m) => (m.mtgId === mtgId ? { ...m, ...patch } : m)) })),

  addMtgDtl: (draft) =>
    set((s) => ({
      mtgDtls: [...s.mtgDtls, { ...draft, mtgDtlId: nextId(s.mtgDtls, "mtgDtlId") }],
    })),

  updateMtgDtl: (mtgDtlId, patch) =>
    set((s) => ({
      mtgDtls: s.mtgDtls.map((d) => (d.mtgDtlId === mtgDtlId ? { ...d, ...patch } : d)),
    })),

  removeMtgDtl: (mtgDtlId) =>
    set((s) => ({ mtgDtls: s.mtgDtls.filter((d) => d.mtgDtlId !== mtgDtlId) })),
}));

/** 해당 회의의 안건 목록 (안건_순서) */
export function mtgDtlsOf(rows: MtgDtl[], mtgId: number): MtgDtl[] {
  return rows
    .filter((d) => d.mtgId === mtgId)
    .sort((a, b) => (a.agndSeq ?? 0) - (b.agndSeq ?? 0));
}

/** 회의 상태 배지 톤 */
export function mtgSttsTone(cd: MtgSttsCd | null): "blue" | "grey" | "red" {
  if (cd === "IN_PROGRESS") return "blue";
  if (cd === "CANCELED") return "red";
  return "grey";
}

/** 안건 처리 구분 배지 톤 */
export function prcsSeTone(cd: PrcsSeCd | null): "amber" | "grey" | "blue" {
  if (cd === "HOLD") return "amber";
  if (cd === "CLOSED") return "blue";
  return "grey";
}
