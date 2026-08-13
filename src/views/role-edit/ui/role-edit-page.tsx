"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activeRoles, cohortText, useMemberStore } from "@/entities/member";
import { useRoleStore } from "@/entities/role";
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";

export function RoleEditPage({ roleId }: { roleId?: string }) {
  const router = useRouter();
  const { roles, roleLabels, addRole, renameRole, setRoleLabel } = useRoleStore();
  const members = useMemberStore((s) => s.members);
  const existing = roleId ? roles.find((r) => r.id === roleId) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [label, setLabel] = useState(existing?.label ?? roleLabels[0] ?? "직책");

  const holders = existing
    ? members.filter((m) => activeRoles(m).includes(existing.name))
    : [];

  const save = () => {
    const next = name.trim();
    if (!next) {
      flash("명칭을 입력하세요");
      return;
    }
    if (roles.some((r) => r.name === next && r.id !== existing?.id)) {
      flash("이미 있는 역할입니다");
      return;
    }
    if (existing) {
      if (next === existing.name && label === existing.label) {
        flash("변경된 내용이 없습니다");
        return;
      }
      if (next !== existing.name) {
        renameRole(existing.id, next);
        flash(`${existing.name} → ${next}`);
      }
      if (label !== existing.label) setRoleLabel(existing.id, label);
      router.replace(ROUTES.roles);
      return;
    }
    addRole(next, label);
    flash(`${next} 추가됨`);
    router.replace(ROUTES.roles);
  };

  return (
    <>
      <PageHeader
        title={existing ? "역할 수정" : "역할 추가"}
        subtitle="명칭 · 분류"
        showBack
      />
      <PageBody maxWidth={1040}>
        <div className="grid grid-cols-[1.2fr_1fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">
                {existing ? "역할 수정" : "새 역할 추가"}
              </SectionLabel>
              <div className="mb-[6px] text-[13.5px] text-n400">명칭</div>
              <TextField
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="역할명"
              />
              <div className="mt-2 text-[13.5px] text-n500">
                {existing ? `${holders.length}명 재임` : "저장 후 집계됩니다"}
              </div>
              <Button className="mt-4 px-[22px] py-3" onClick={save}>
                저장
              </Button>
            </Card>

            <Card>
              <div className="mb-3 flex items-center">
                <SectionLabel>역할 분류</SectionLabel>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.roleLabels)}
                  className="cursor-pointer text-[14px] text-accent"
                >
                  분류 관리 ›
                </button>
              </div>
              <div className="flex flex-wrap gap-[7px]">
                {roleLabels.map((l) => (
                  <Chip key={l} active={label === l} onClick={() => setLabel(l)}>
                    {l}
                  </Chip>
                ))}
              </div>
              <div className="mt-3 text-[13.5px] text-n500">
                분류는 하나만 지정됩니다. 역할 목록에서 분류로 필터할 수 있습니다.
              </div>
            </Card>
          </div>

          <Card>
            <SectionLabel className="mb-3">재임 회원</SectionLabel>
            {holders.length === 0 ? (
              <EmptyState message="재임 중인 회원이 없습니다." padding="sm" />
            ) : (
              <div className="flex flex-col">
                {holders.map((m) => (
                  <div
                    key={m.key}
                    onClick={() => router.push(ROUTES.memberDetail(m.key))}
                    className="cursor-pointer border-t border-black/5 py-3 first:border-t-0"
                  >
                    <div className="text-[15.5px] font-semibold hover:text-accent">
                      {m.name}
                    </div>
                    <div className="mt-[2px] text-[13.5px] text-n500">
                      {cohortText(m)} · {m.grade}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
