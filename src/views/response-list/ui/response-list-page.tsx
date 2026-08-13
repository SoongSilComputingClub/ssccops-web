"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore } from "@/entities/form";
import { useMemberStore } from "@/entities/member";
import {
  RESPONSE_STATUS,
  useResponseStore,
  type FormResponse,
  type ResponseStatus,
} from "@/entities/response";
import { ResponseStatusSheet } from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  type GridColumn,
} from "@/shared/ui";

const TABS = [
  { label: "전체", value: "전체" },
  { label: "제출", value: "SUBMITTED" },
  { label: "승인", value: "ACCEPTED" },
  { label: "반려", value: "REJECTED" },
] as const;

export function ResponseListPage({ formKey }: { formKey: string }) {
  const router = useRouter();
  const form = useFormStore((s) => s.forms.find((f) => f.key === formKey));
  const responses = useResponseStore((s) =>
    s.responses.filter((r) => r.form === formKey),
  );
  const members = useMemberStore((s) => s.members);
  const [tab, setTab] = useState<string>("전체");
  const [sheetTarget, setSheetTarget] = useState<FormResponse | null>(null);

  const filtered = responses.filter((r) => tab === "전체" || r.status === tab);

  const memberOf = (r: FormResponse) =>
    r.member ? members.find((m) => m.key === r.member) : undefined;

  const columns: GridColumn<FormResponse>[] = [
    {
      key: "name",
      header: "회원명",
      width: "1fr",
      render: (r) => (
        <span
          onClick={() => router.push(ROUTES.responseDetail(formKey, r.id))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {memberOf(r)?.name ?? r.guest?.name ?? "비회원 응답"}
        </span>
      ),
    },
    {
      key: "sid",
      header: "학생번호",
      width: ".9fr",
      render: (r) => memberOf(r)?.sid ?? r.guest?.sid ?? "비회원",
    },
    {
      key: "meta",
      header: "학과 · 등급 · 상태",
      width: "1.6fr",
      render: (r) => {
        const m = memberOf(r);
        if (m) return `${m.dept} · ${m.grade} · ${m.status}`;
        return `${r.guest?.dept ?? "-"} · 임시회원 · 검토`;
      },
    },
    { key: "at", header: "제출일시", width: "1fr", render: (r) => r.at },
    {
      key: "status",
      header: "상태",
      width: "120px",
      render: (r) => {
        const rs = RESPONSE_STATUS[r.status];
        return (
          <span onClick={() => setSheetTarget(r)} className="cursor-pointer">
            <Badge tone={rs.tone}>{rs.label}</Badge>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="응답 목록" subtitle={form?.title ?? formKey} showBack />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[7px]">
          {TABS.map((t) => (
            <Chip key={t.value} active={tab === t.value} onClick={() => setTab(t.value)}>
              {t.label}
            </Chip>
          ))}
          <div className="flex-1" />
          <div className="text-[14px] text-n500">{filtered.length}건</div>
        </div>

        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            dense
            empty={<EmptyState message="해당 상태의 응답이 없습니다." />}
          />
        </Card>

        <ResponseStatusSheet
          responseId={sheetTarget?.id ?? null}
          current={sheetTarget?.status as ResponseStatus | undefined}
          onClose={() => setSheetTarget(null)}
        />
      </PageBody>
    </>
  );
}
