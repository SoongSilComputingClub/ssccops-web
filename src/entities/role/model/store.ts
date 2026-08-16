"use client";

import { create } from "zustand";
import { TODAY } from "@/shared/config/constants";
import { nextId } from "@/shared/lib/id";
import roleSeed from "../api/get-role.json";
import roleClsfSeed from "../api/get-role-clsf.json";
import type { Role, RoleClsf } from "./types";

interface RoleState {
  roles: Role[];
  roleClsfs: RoleClsf[];

  addRole: (roleNm: string, roleClsfCd: string) => Role;
  renameRole: (roleId: number, roleNm: string) => void;
  setRoleClsf: (roleId: number, roleClsfCd: string) => void;

  addRoleClsf: (roleClsfNm: string) => void;
  /** 분류명 변경 — 코드는 유지하고 표시명만 바꾼다 */
  renameRoleClsf: (roleClsfCd: string, roleClsfNm: string) => void;
  removeRoleClsf: (roleClsfCd: string) => void;
}

/** 분류명 → 코드값 채번 (사용자 추가분은 CLSF_n) */
function nextRoleClsfCd(rows: RoleClsf[]): string {
  return `CLSF_${rows.length + 1}`;
}

export const useRoleStore = create<RoleState>((set) => ({
  roles: roleSeed.data as Role[],
  roleClsfs: roleClsfSeed.data as RoleClsf[],

  addRole: (roleNm, roleClsfCd) => {
    let role: Role = {
      roleId: 0,
      indctSeqno: 0,
      roleNm,
      roleClsfCd,
      crtDt: `${TODAY}T10:00:00`,
      mdfcnDt: `${TODAY}T10:00:00`,
    };
    set((s) => {
      role = { ...role, roleId: nextId(s.roles, "roleId"), indctSeqno: s.roles.length + 1 };
      return { roles: [...s.roles, role] };
    });
    return role;
  },

  renameRole: (roleId, roleNm) =>
    set((s) => ({
      roles: s.roles.map((r) =>
        r.roleId === roleId ? { ...r, roleNm, mdfcnDt: `${TODAY}T10:00:00` } : r,
      ),
    })),

  setRoleClsf: (roleId, roleClsfCd) =>
    set((s) => ({
      roles: s.roles.map((r) =>
        r.roleId === roleId ? { ...r, roleClsfCd, mdfcnDt: `${TODAY}T10:00:00` } : r,
      ),
    })),

  addRoleClsf: (roleClsfNm) =>
    set((s) => ({
      roleClsfs: [
        ...s.roleClsfs,
        {
          roleClsfCd: nextRoleClsfCd(s.roleClsfs),
          roleClsfNm,
          indctSeqno: s.roleClsfs.length + 1,
        },
      ],
    })),

  renameRoleClsf: (roleClsfCd, roleClsfNm) =>
    set((s) => ({
      roleClsfs: s.roleClsfs.map((c) =>
        c.roleClsfCd === roleClsfCd ? { ...c, roleClsfNm } : c,
      ),
    })),

  removeRoleClsf: (roleClsfCd) =>
    set((s) => ({ roleClsfs: s.roleClsfs.filter((c) => c.roleClsfCd !== roleClsfCd) })),
}));
