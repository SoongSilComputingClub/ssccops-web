"use client";

import { create } from "zustand";
import { nextId } from "@/shared/lib/id";
import seed from "../api/get-sub-work-type.json";
import type { SubWorkType } from "./types";

interface SubWorkTypeState {
  subWorkTypes: SubWorkType[];

  addSubWorkType: (draft: Omit<SubWorkType, "subWorkTypeId">) => number;
  updateSubWorkType: (subWorkTypeId: number, patch: Partial<SubWorkType>) => void;
}

export const useSubWorkTypeStore = create<SubWorkTypeState>((set) => ({
  subWorkTypes: seed.data as SubWorkType[],

  addSubWorkType: (draft) => {
    let subWorkTypeId = 0;
    set((s) => {
      subWorkTypeId = nextId(s.subWorkTypes, "subWorkTypeId");
      return { subWorkTypes: [...s.subWorkTypes, { ...draft, subWorkTypeId }] };
    });
    return subWorkTypeId;
  },

  updateSubWorkType: (subWorkTypeId, patch) =>
    set((s) => ({
      subWorkTypes: s.subWorkTypes.map((t) =>
        t.subWorkTypeId === subWorkTypeId ? { ...t, ...patch } : t,
      ),
    })),
}));

/** 하위_업무_유형_ID → 유형_명 */
export function subWorkTypeNm(types: SubWorkType[], subWorkTypeId: number): string {
  return types.find((t) => t.subWorkTypeId === subWorkTypeId)?.typeNm ?? "-";
}

export function findSubWorkType(
  types: SubWorkType[],
  subWorkTypeId: number,
): SubWorkType | undefined {
  return types.find((t) => t.subWorkTypeId === subWorkTypeId);
}

/** 유형 배지 톤 — 금전 집행 유형은 blue */
export function subWorkTypeTone(type: SubWorkType | undefined): "blue" | "grey" {
  return type?.expndYn ? "blue" : "grey";
}

/** 기준_금액 표기 — "300,000원 이상" */
export function crtrAmtText(type: SubWorkType): string {
  return type.crtrAmt === null ? "-" : `${type.crtrAmt.toLocaleString("ko-KR")}원 이상`;
}
