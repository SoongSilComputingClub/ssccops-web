"use client";

import { create } from "zustand";
import seed from "../api/get-operations-types.json";
import type { OpType } from "./types";

interface OpTypeState {
  opTypes: OpType[];
  saveOpType: (name: string, next: OpType) => void; // name=""이면 신규
  toggleOpType: (name: string) => void;
}

export const useOpTypeStore = create<OpTypeState>((set) => ({
  opTypes: seed.data as OpType[],

  saveOpType: (name, next) =>
    set((s) => ({
      opTypes: name
        ? s.opTypes.map((t) => (t.name === name ? next : t))
        : [...s.opTypes, next],
    })),

  toggleOpType: (name) =>
    set((s) => ({
      opTypes: s.opTypes.map((t) => (t.name === name ? { ...t, on: !t.on } : t)),
    })),
}));
