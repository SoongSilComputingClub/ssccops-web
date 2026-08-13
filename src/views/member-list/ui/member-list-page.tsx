"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activeRoles,
  cohortText,
  gradeTone,
  isGraduate,
  statusTone,
  useMemberStore,
  type Member,
} from "@/entities/member";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  SearchInput,
  type GridColumn,
} from "@/shared/ui";

const SORTS = ["이름순", "기수순", "가입일순", "최근 수정순"] as const;

export function MemberListPage() {
  const router = useRouter();
  const { members, grades, statuses } = useMemberStore();
  const [q, setQ] = useState("");
  const [fGrade, setFGrade] = useState("전체");
  const [fStatus, setFStatus] = useState("전체");
  const [sortIdx, setSortIdx] = useState(0);

  const filtered = useMemo(() => {
    const list = members.filter(
      (m) =>
        (m.name.includes(q) || m.sid.includes(q)) &&
        (fGrade === "전체" || m.grade === fGrade) &&
        (fStatus === "전체" || m.status === fStatus),
    );
    const sort = SORTS[sortIdx];
    return [...list].sort((a, b) => {
      if (sort === "이름순") return a.name.localeCompare(b.name, "ko");
      if (sort === "기수순") return Number(b.cohort || 0) - Number(a.cohort || 0);
      if (sort === "가입일순") return b.joined.localeCompare(a.joined);
      return a.key.localeCompare(b.key); // 최근 수정순 (원본: key 오름차순)
    });
  }, [members, q, fGrade, fStatus, sortIdx]);

  const columns: GridColumn<Member>[] = [
    {
      key: "name",
      header: "회원명",
      width: "1.1fr",
      render: (m) => (
        <span className="font-semibold hover:text-accent">{m.name}</span>
      ),
    },
    {
      key: "sid",
      header: "학생번호",
      width: ".9fr",
      render: (m) => m.sid || <span className="text-n500">학번 미확인</span>,
    },
    { key: "cohort", header: "기수", width: ".5fr", render: (m) => cohortText(m) },
    {
      key: "dept",
      header: "학과 · 학년",
      width: "1.2fr",
      render: (m) =>
        isGraduate(m)
          ? `${m.dept || "학과 미입력"} · ${m.gradYear ? `${m.gradYear}년 졸업` : "졸업"}`
          : `${m.dept || "학과 미입력"} · ${m.year}학년`,
    },
    {
      key: "grade",
      header: "등급",
      width: ".8fr",
      render: (m) => <Badge tone={gradeTone(m.grade)}>{m.grade}</Badge>,
    },
    {
      key: "status",
      header: "상태",
      width: ".8fr",
      render: (m) => <Badge tone={statusTone(m.status)}>{m.status}</Badge>,
    },
    {
      key: "roles",
      header: "현재 역할",
      width: "1.3fr",
      render: (m) => activeRoles(m).join(", ") || "—",
    },
  ];

  return (
    <>
      <PageHeader
        title="회원 관리"
        subtitle="SSCC 운영관리시스템"
        action={{ label: "+ 회원", onClick: () => router.push(ROUTES.memberNew) }}
      />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[10px]">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="회원명 · 학생번호"
            className="max-w-[320px] flex-1"
          />
          <div className="flex-1" />
          <div className="text-[14px] text-n500">
            {filtered.length}명 · 전체 {members.length}명
          </div>
          <button
            type="button"
            onClick={() => setSortIdx((i) => (i + 1) % SORTS.length)}
            className="cursor-pointer text-[14px] whitespace-nowrap text-accent"
          >
            {SORTS[sortIdx]} ⇅
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-[7px]">
            <div className="text-[13px] text-n500">등급</div>
            {["전체", ...grades.filter((g) => g.on).map((g) => g.name)].map((g) => (
              <Chip key={g} active={fGrade === g} onClick={() => setFGrade(g)}>
                {g}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-[7px]">
            <div className="text-[13px] text-n500">상태</div>
            {["전체", ...statuses.filter((s) => s.on).map((s) => s.name)].map((s) => (
              <Chip key={s} active={fStatus === s} onClick={() => setFStatus(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={filtered}
            rowKey={(m) => m.key}
            onRowClick={(m) => router.push(ROUTES.memberDetail(m.key))}
            empty={
              <EmptyState
                message="조건에 맞는 회원이 없습니다."
                action={{
                  label: "필터 초기화",
                  onClick: () => {
                    setQ("");
                    setFGrade("전체");
                    setFStatus("전체");
                  },
                }}
              />
            }
          />
        </Card>
      </PageBody>
    </>
  );
}
