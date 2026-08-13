"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activeRoles, useMemberStore } from "@/entities/member";
import { useRoleStore } from "@/entities/role";
import { ROUTES } from "@/shared/config/routes";
import {
  Card,
  Chip,
  GridTable,
  PageBody,
  PageHeader,
  Segmented,
  type GridColumn,
} from "@/shared/ui";
import type { Role } from "@/entities/role";

export function RoleListPage() {
  const router = useRouter();
  const roles = useRoleStore((s) => s.roles);
  const roleLabels = useRoleStore((s) => s.roleLabels);
  const members = useMemberStore((s) => s.members);
  const [filter, setFilter] = useState("전체");

  const usage = (roleName: string) =>
    members.filter((m) => activeRoles(m).includes(roleName)).length;

  const filtered = roles.filter((r) => filter === "전체" || r.label === filter);

  const columns: GridColumn<Role>[] = [
    { key: "no", header: "순번", width: "60px", render: (_r, i) => i + 1 },
    {
      key: "name",
      header: "명칭",
      width: "1fr",
      render: (r) => (
        <span
          className={
            r.on ? "font-semibold hover:text-accent" : "text-n500 line-through"
          }
        >
          {r.name}
        </span>
      ),
    },
    { key: "label", header: "역할 분류", width: "140px", render: (r) => r.label },
    {
      key: "usage",
      header: "사용 현황",
      width: "160px",
      render: (r) => `${usage(r.name)}명 사용`,
    },
    {
      key: "chevron",
      header: "",
      width: "60px",
      align: "right",
      render: () => <span className="text-n500">›</span>,
    },
  ];

  return (
    <>
      <PageHeader title="역할 관리" subtitle="역할 목록 · 역할 분류" />
      <PageBody>
        <div className="mb-4 flex items-center gap-3">
          <Segmented
            options={["역할 목록", "역할 분류"] as const}
            value="역할 목록"
            onChange={(v) => {
              if (v === "역할 분류") router.push(ROUTES.roleLabels);
            }}
            className="w-[400px]"
          />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => router.push(ROUTES.roleNew)}
            className="cursor-pointer rounded-[12px] border border-accent bg-accent px-4 py-[9px] text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            + 새 역할
          </button>
        </div>

        <div className="mb-[14px] flex items-center gap-[7px]">
          {["전체", ...roleLabels].map((l) => (
            <Chip key={l} active={filter === l} onClick={() => setFilter(l)}>
              {l}
            </Chip>
          ))}
          <div className="flex-1" />
          <div className="text-[14px] text-n500">
            {filtered.length}개 역할 · 전체 {roles.length}개
          </div>
        </div>

        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            onRowClick={(r) => router.push(ROUTES.roleEdit(r.id))}
          />
        </Card>
        <div className="mt-3 text-[13.5px] text-n500">
          항목을 눌러 상세에서 수정합니다. 사용 중인 값은 물리 삭제하지 않고
          비활성화합니다.
        </div>
      </PageBody>
    </>
  );
}
