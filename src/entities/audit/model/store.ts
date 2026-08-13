"use client";

import { create } from "zustand";
import seed from "../api/get-audit-logs.json";

/** 감사 로그 — 원본 디자인에 화면은 없으나 승인/변경 뮤테이션이 기록을 남긴다 (추후 화면 연결용) */
export interface AuditEntry {
  target: string; // 승인 · 하위 업무 · 운영 · 회의 · 회원 · 역할 · 기준정보 · 폼 · 로그인 · CSV
  id: string;
  action: string;
  by: string;
  before: string;
  after: string;
  ip: string;
  at: string;
}

interface AuditState {
  audit: AuditEntry[];
  append: (entry: AuditEntry) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  audit: seed.data as AuditEntry[],
  append: (entry) => set((s) => ({ audit: [entry, ...s.audit] })),
}));
