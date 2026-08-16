"use client";

import { create } from "zustand";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import operSeed from "../api/get-oper.json";
import type { Oper } from "./types";

interface OperState {
  opers: Oper[];

  /** 신규 등록 — 채번된 operId 반환 */
  addOper: (draft: Omit<Oper, "operId" | "crtDt" | "mdfcnDt">) => number;
  updateOper: (operId: number, patch: Partial<Oper>) => void;
  /** 소프트 삭제 — 삭제_일시 기록 */
  removeOper: (operId: number) => void;
}

export const useOperStore = create<OperState>((set) => ({
  opers: operSeed.data as Oper[],

  addOper: (draft) => {
    let operId = 0;
    set((s) => {
      operId = nextId(s.opers, "operId");
      const now = `${TODAY}T10:00:00`;
      return { opers: [...s.opers, { ...draft, operId, crtDt: now, mdfcnDt: now }] };
    });
    return operId;
  },

  updateOper: (operId, patch) =>
    set((s) => ({
      opers: s.opers.map((o) =>
        o.operId === operId ? { ...o, ...patch, mdfcnDt: `${TODAY}T10:00:00` } : o,
      ),
    })),

  removeOper: (operId) =>
    set((s) => ({
      opers: s.opers.map((o) =>
        o.operId === operId ? { ...o, delDt: `${TODAY}T10:00:00` } : o,
      ),
    })),
}));

/** 운영_ID → 운영 건. 소프트 삭제된 건도 반환한다 */
export function findOper(opers: Oper[], operId: number): Oper | undefined {
  return opers.find((o) => o.operId === operId);
}

/** 운영_제목 — 없으면 "-" */
export function operTtl(opers: Oper[], operId: number): string {
  return findOper(opers, operId)?.operTtl ?? "-";
}
