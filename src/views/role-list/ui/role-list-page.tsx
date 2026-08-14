"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currentRoleRels, useMbrStore } from "@/entities/member";
import { roleClsfNm, useRoleStore } from "@/entities/role";
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

const ALL = "전체";

export function RoleListPage() {
  const router = useRouter();
  const roles = useRoleStore((s) => s.roles);
  const roleClsfs = useRoleStore((s) => s.roleClsfs);
  const { mbrs, mbrRoleRels } = useMbrStore();
  const [filter, setFilter] = useState<string>(ALL);

  /** 해당 역할을 현재 보유한 회원 수 */
  const usage = (roleId: number) =>
    mbrs.filter((m) =>
      currentRoleRels(mbrRoleRels, m.mbrId).some((r) => r.roleId === roleId),
    ).length;

  const filtered = roles.filter((r) => filter === ALL || r.roleClsfCd === filter);

  const columns: GridColumn<Role>[] = [
    { key: "indctSeqno", header: "표시_순번", width: "80px", render: (r) => r.indctSeqno },
    {
      key: "roleNm",
      header: "역할_명",
      width: "1fr",
      render: (r) => <span className="font-semibold hover:text-accent">{r.roleNm}</span>,
    },
    {
      key: "roleClsfCd",
      header: "역할_분류",
      width: "140px",
      render: (r) => roleClsfNm(roleClsfs, r.roleClsfCd),
    },
    {
      key: "usage",
      header: "사용 현황",
      width: "160px",
      render: (r) => `${usage(r.roleId)}명 사용`,
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
          <Chip active={filter === ALL} onClick={() => setFilter(ALL)}>
            {ALL}
          </Chip>
          {roleClsfs.map((c) => (
            <Chip
              key={c.roleClsfCd}
              active={filter === c.roleClsfCd}
              onClick={() => setFilter(c.roleClsfCd)}
            >
              {c.roleClsfNm}
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
            rowKey={(r) => String(r.roleId)}
            onRowClick={(r) => router.push(ROUTES.roleEdit(r.roleId))}
          />
        </Card>
        <div className="mt-3 text-[13.5px] text-n500">
          항목을 눌러 상세에서 수정합니다.
        </div>
      </PageBody>
    </>
  );
}
