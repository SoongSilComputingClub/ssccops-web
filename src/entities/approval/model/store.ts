"use client";

import { create } from "zustand";
import type { AprvSttsCd } from "@/shared/config/codes";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import aprvSeed from "../api/get-sub-work-aprv.json";
import voteSeed from "../api/get-sub-work-aprv-vote.json";
import rjctSeed from "../api/get-sub-work-rjct.json";
import type { AgreTally, SubWorkAprv, SubWorkAprvVote, SubWorkRjct } from "./types";

interface AprvState {
  subWorkAprvs: SubWorkAprv[];
  subWorkAprvVotes: SubWorkAprvVote[];
  subWorkRjcts: SubWorkRjct[];

  /** 승인 확정 — 하위_업무_승인_일시 기록 */
  approve: (subWorkAprvId: number, mbrId: number) => void;
  /** 동의/부동의 투표 등록 */
  vote: (subWorkAprvId: number, mbrId: number, agreYn: boolean) => void;
  /** 반려 등록 */
  reject: (subWorkId: number, mbrId: number, rjctRsn: string) => void;
}

export const useAprvStore = create<AprvState>((set) => ({
  subWorkAprvs: aprvSeed.data as SubWorkAprv[],
  subWorkAprvVotes: voteSeed.data as SubWorkAprvVote[],
  subWorkRjcts: rjctSeed.data as SubWorkRjct[],

  approve: (subWorkAprvId, mbrId) =>
    set((s) => ({
      subWorkAprvs: s.subWorkAprvs.map((a) =>
        a.subWorkAprvId === subWorkAprvId
          ? { ...a, mbrId, subWorkAprvDt: `${TODAY}T10:00:00` }
          : a,
      ),
    })),

  vote: (subWorkAprvId, mbrId, agreYn) =>
    set((s) => ({
      subWorkAprvVotes: [
        ...s.subWorkAprvVotes,
        {
          aprvVoteId: nextId(s.subWorkAprvVotes, "aprvVoteId"),
          subWorkAprvId,
          mbrId,
          agreYn,
          voteDt: `${TODAY}T10:00:00`,
        },
      ],
    })),

  reject: (subWorkId, mbrId, rjctRsn) =>
    set((s) => ({
      subWorkRjcts: [
        ...s.subWorkRjcts,
        {
          subWorkRjctId: nextId(s.subWorkRjcts, "subWorkRjctId"),
          subWorkId,
          mbrId,
          rjctRsn,
        },
      ],
    })),
}));

/* ── 파생 ──────────────────────────────────────────────────── */

/** 하위 업무의 승인 건 */
export function aprvOf(
  aprvs: SubWorkAprv[],
  subWorkId: number,
): SubWorkAprv | undefined {
  return aprvs.find((a) => a.subWorkId === subWorkId);
}

/** 하위 업무의 반려 사유 */
export function rjctRsnOf(rjcts: SubWorkRjct[], subWorkId: number): string {
  return rjcts.find((r) => r.subWorkId === subWorkId)?.rjctRsn ?? "";
}

/**
 * 정족수 집계 — 최소_필요_동의_수와 투표 결과로 파생한다.
 * 정족수를 쓰지 않는 유형은 null.
 */
export function agreTally(
  votes: SubWorkAprvVote[],
  subWorkAprvId: number,
  minNeedAgreCnt: number | null,
): AgreTally | null {
  if (!minNeedAgreCnt) return null;
  const rows = votes.filter((v) => v.subWorkAprvId === subWorkAprvId);
  return {
    need: minNeedAgreCnt,
    agre: rows.filter((v) => v.agreYn === true).length,
    dsagre: rows.filter((v) => v.agreYn === false).length,
  };
}

/** 승인 상태 배지 톤 */
export function aprvSttsTone(cd: AprvSttsCd): "amber" | "blue" | "red" | "grey" {
  if (cd === "APPROVED") return "blue";
  if (cd === "REJECTED") return "red";
  if (cd === "PENDING" || cd === "REAPPROVAL_REQUIRED") return "amber";
  return "grey";
}
