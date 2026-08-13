"use client";

import { create } from "zustand";
import { TODAY } from "@/shared/config/constants";
import { nextKey, nextMemberId } from "@/shared/lib/id";
import membersSeed from "../api/get-members.json";
import referenceSeed from "../api/get-members-reference.json";
import historySeed from "../api/get-members-history.json";
import linksSeed from "../api/get-members-social-links.json";
import type { Member, MemberHistory, RefItem, SocialLink } from "./types";

interface MemberState {
  members: Member[];
  grades: RefItem[];
  statuses: RefItem[];
  history: MemberHistory[];
  links: Record<string, SocialLink[]>;

  updateMember: (key: string, patch: Partial<Member>) => void;
  /** 신규 등록 — 생성된 key 반환 */
  addMember: (draft: Omit<Member, "id" | "key">) => string;
  addHistory: (entry: MemberHistory) => void;
  addRole: (key: string, roleName: string) => void;
  endRole: (key: string, roleName: string) => void;
  setLinks: (key: string, links: SocialLink[]) => void;
}

export const useMemberStore = create<MemberState>((set) => ({
  members: membersSeed.data as Member[],
  grades: referenceSeed.data.grades,
  statuses: referenceSeed.data.statuses,
  history: historySeed.data as MemberHistory[],
  links: linksSeed.data as Record<string, SocialLink[]>,

  updateMember: (key, patch) =>
    set((s) => ({
      members: s.members.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    })),

  addMember: (draft) => {
    let key = "";
    set((s) => {
      key = nextKey("m", s.members.length);
      const member: Member = {
        ...draft,
        key,
        id: nextMemberId(s.members.length),
      };
      return { members: [...s.members, member] };
    });
    return key;
  },

  addHistory: (entry) => set((s) => ({ history: [entry, ...s.history] })),

  addRole: (key, roleName) =>
    set((s) => ({
      members: s.members.map((m) =>
        m.key === key
          ? {
              ...m,
              roles: [...m.roles, { name: roleName, from: TODAY, to: "", primary: false }],
            }
          : m,
      ),
    })),

  endRole: (key, roleName) =>
    set((s) => ({
      members: s.members.map((m) =>
        m.key === key
          ? {
              ...m,
              roles: m.roles.map((r) =>
                r.name === roleName && !r.to ? { ...r, to: TODAY } : r,
              ),
            }
          : m,
      ),
    })),

  setLinks: (key, links) => set((s) => ({ links: { ...s.links, [key]: links } })),
}));

/** 등급 배지 톤: 임시회원=grey, 그 외=blue */
export function gradeTone(grade: string): "grey" | "blue" {
  return grade === "임시회원" ? "grey" : "blue";
}

/** 상태 배지 톤: 검토=amber, 탈퇴·제명=red, 그 외=grey */
export function statusTone(status: string): "amber" | "red" | "grey" {
  if (status === "검토") return "amber";
  if (status === "탈퇴" || status === "제명") return "red";
  return "grey";
}

export function cohortText(m: Member): string {
  return !m.cohort || m.cohort === "미배정" ? "미배정" : `${m.cohort}기`;
}

export function isGraduate(m: Member): boolean {
  return m.kind === "졸업생" || m.status === "졸업";
}

/** 재임 중(종료일 없는) 역할 이름 목록 */
export function activeRoles(m: Member): string[] {
  return m.roles.filter((r) => !r.to).map((r) => r.name);
}

/** 사이드바 프로필용 대표 역할 표기 */
export function memberRoleLabel(m: Member): string {
  const primary =
    m.roles.find((r) => r.primary && !r.to) ?? m.roles.find((r) => !r.to);
  return `${primary ? primary.name : m.grade} · ${m.grade}`;
}
