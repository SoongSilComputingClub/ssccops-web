"use client";

import { create } from "zustand";
import { nextKey } from "@/shared/lib/id";
import seed from "../api/get-members-roles.json";
import type { Role } from "./types";

interface RoleState {
  roles: Role[];
  roleLabels: string[];

  addRole: (name: string, label: string) => Role;
  renameRole: (id: string, name: string) => void;
  setRoleLabel: (id: string, label: string) => void;
  toggleRole: (id: string) => void;

  addLabel: (name: string) => void;
  /** 분류명 변경 — 지정된 역할에도 전파 */
  renameLabel: (oldName: string, newName: string) => void;
  removeLabel: (name: string) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  roles: seed.data.roles as Role[],
  roleLabels: seed.data.roleLabels,

  addRole: (name, label) => {
    let role: Role = { id: "", name, on: true, label };
    set((s) => {
      role = { ...role, id: nextKey("r", s.roles.length) };
      return { roles: [...s.roles, role] };
    });
    return role;
  },

  renameRole: (id, name) =>
    set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, name } : r)) })),

  setRoleLabel: (id, label) =>
    set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, label } : r)) })),

  toggleRole: (id) =>
    set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, on: !r.on } : r)) })),

  addLabel: (name) => set((s) => ({ roleLabels: [...s.roleLabels, name] })),

  renameLabel: (oldName, newName) =>
    set((s) => ({
      roleLabels: s.roleLabels.map((l) => (l === oldName ? newName : l)),
      roles: s.roles.map((r) => (r.label === oldName ? { ...r, label: newName } : r)),
    })),

  removeLabel: (name) =>
    set((s) => ({ roleLabels: s.roleLabels.filter((l) => l !== name) })),
}));
