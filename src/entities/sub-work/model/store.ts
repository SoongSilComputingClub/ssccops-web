"use client";

import { create } from "zustand";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import subWorkSeed from "../api/get-sub-work.json";
import chckListSeed from "../api/get-sub-work-chck-list.json";
import picAltmntSeed from "../api/get-sub-work-pic-altmnt.json";
import sttsHstrySeed from "../api/get-sub-work-stts-hstry.json";
import type {
  SubWork,
  SubWorkChckList,
  SubWorkPicAltmnt,
  SubWorkSttsHstry,
} from "./types";

interface SubWorkState {
  subWorks: SubWork[];
  subWorkChckLists: SubWorkChckList[];
  subWorkPicAltmnts: SubWorkPicAltmnt[];
  subWorkSttsHstrys: SubWorkSttsHstry[];

  addSubWork: (draft: Omit<SubWork, "subWorkId">) => number;
  updateSubWork: (subWorkId: number, patch: Partial<SubWork>) => void;
  /** 점검 목록 일괄 추가 (신규 하위 업무의 기본 항목) */
  addChckArtcls: (subWorkId: number, chckArtclCns: readonly string[]) => void;
  addSubWorkPicAltmnt: (subWorkId: number, mbrId: number, tkcgSeCd: "OWNER" | "COLLABORATOR") => void;
  addSubWorkSttsHstry: (entry: Omit<SubWorkSttsHstry, "subWorkSttsHstryId">) => void;
}

export const useSubWorkStore = create<SubWorkState>((set) => ({
  subWorks: subWorkSeed.data as SubWork[],
  subWorkChckLists: chckListSeed.data as SubWorkChckList[],
  subWorkPicAltmnts: picAltmntSeed.data as SubWorkPicAltmnt[],
  subWorkSttsHstrys: sttsHstrySeed.data as SubWorkSttsHstry[],

  addSubWork: (draft) => {
    let subWorkId = 0;
    set((s) => {
      subWorkId = nextId(s.subWorks, "subWorkId");
      return { subWorks: [...s.subWorks, { ...draft, subWorkId }] };
    });
    return subWorkId;
  },

  updateSubWork: (subWorkId, patch) =>
    set((s) => ({
      subWorks: s.subWorks.map((w) =>
        w.subWorkId === subWorkId ? { ...w, ...patch } : w,
      ),
    })),

  addChckArtcls: (subWorkId, chckArtclCns) =>
    set((s) => {
      let seq = s.subWorkChckLists.reduce(
        (m, c) => Math.max(m, c.subWorkChckListId),
        0,
      );
      return {
        subWorkChckLists: [
          ...s.subWorkChckLists,
          ...chckArtclCns.map((chckArtclCn, i) => ({
            subWorkChckListId: ++seq,
            subWorkId,
            chckArtclCn,
            cmptnYn: false,
            sortSeq: i + 1,
          })),
        ],
      };
    }),

  addSubWorkPicAltmnt: (subWorkId, mbrId, tkcgSeCd) =>
    set((s) => ({
      subWorkPicAltmnts: [
        ...s.subWorkPicAltmnts,
        {
          subWorkPicAltmntId: nextId(s.subWorkPicAltmnts, "subWorkPicAltmntId"),
          subWorkId,
          mbrId,
          tkcgSeCd,
        },
      ],
    })),

  addSubWorkSttsHstry: (entry) =>
    set((s) => ({
      subWorkSttsHstrys: [
        { ...entry, subWorkSttsHstryId: nextId(s.subWorkSttsHstrys, "subWorkSttsHstryId") },
        ...s.subWorkSttsHstrys,
      ],
    })),
}));

/* ── 파생 ──────────────────────────────────────────────────── */

/**
 * 해당 하위 업무의 점검 목록 (정렬_순서).
 *
 * 밖으로 내보내지 않는다 — 상세 화면이 서버 연동으로 옮겨 가면서(#39) 목 점검 목록을 직접
 * 읽는 화면이 사라졌고, 남은 사용처는 아래 진행률 하나뿐이다.
 */
function chckListOf(
  rows: SubWorkChckList[],
  subWorkId: number,
): SubWorkChckList[] {
  return rows
    .filter((c) => c.subWorkId === subWorkId)
    .sort((a, b) => a.sortSeq - b.sortSeq);
}

/** 점검 목록 완료율 0-100 — 화면 진행률은 이 값에서 파생한다 */
export function chckPrgrsRt(rows: SubWorkChckList[], subWorkId: number): number {
  const items = chckListOf(rows, subWorkId);
  if (!items.length) return 0;
  return Math.round((items.filter((c) => c.cmptnYn).length / items.length) * 100);
}

/** 담당자(OWNER) 회원_ID */
export function ownerMbrId(
  rows: SubWorkPicAltmnt[],
  subWorkId: number,
): number | undefined {
  return rows.find((p) => p.subWorkId === subWorkId && p.tkcgSeCd === "OWNER")?.mbrId;
}

/* 협업자 목록(collabMbrIds)은 지웠다 — 유일한 사용처였던 상세 화면이 서버 응답의
 * collaborators를 쓴다 (#39). 배정 테이블은 서버도 아직 매핑하지 않아 늘 비어 있다. */

/** 목록 상태 배지: 승인 대기(amber) · 완료(grey) · 진행(blue) */
export function subWorkSttsBadge(
  subWork: SubWork,
): { label: string; tone: "amber" | "grey" | "blue" } {
  if (subWork.aprvSttsCd === "PENDING") return { label: "승인 대기", tone: "amber" };
  if (isSubWorkDone(subWork)) return { label: "완료", tone: "grey" };
  return { label: "진행", tone: "blue" };
}

export function isSubWorkDone(subWork: SubWork): boolean {
  return subWork.workSttsCd === "DONE";
}

/** 완료 처리 — 상태·완료_일시를 함께 기록한다 */
export function completedPatch(): Partial<SubWork> {
  return { workSttsCd: "DONE", cmptnDt: `${TODAY}T10:00:00`, dlyYn: false };
}
