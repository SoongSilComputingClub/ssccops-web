"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  currentRoleRels,
  genNoText,
  isGraduate,
  mbrGrdNm,
  mbrGrdTone,
  mbrSttsNm,
  mbrSttsTone,
  useMbrStore,
  type Mbr,
} from "@/entities/member";
import { roleNmOf, useRoleStore } from "@/entities/role";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
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

/*
 * 회원 명부 (#52 · 서버 #76).
 *
 * ── 왜 화면 자체를 열지 않는가 ──────────────────────────────────
 * 사이드바에서 메뉴를 감추는 것(#29)은 안내일 뿐이라 주소를 직접 치면 화면은 열린다. 이 화면은
 * 학번·연락처·이메일이 담긴 실제 명부이고 서버도 조회(GET /v1/members)부터 MEMBER_MANAGE 를
 * 요구하므로, 권한이 없으면 목록 대신 안내를 보여 준다 — 권한 관리 화면(views/authority-tree ·
 * views/role-authorities)이 쓴 방식 그대로다. 판정은 #29 의 useCan 하나만 쓴다.
 *
 * MEMBER_MANAGE 는 EXECUTIVE 의 자식이라 국장(OPERATOR)에게는 없다. 그래서 국장이 이 안내를
 * 보는 것은 정상이다 — 근거는 entities/session/model/types.ts 의 CAPABILITY 주석.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 회원 명부를 볼 수 없습니다 — 운영진에게 요청해주세요";

const SORTS = ["이름순", "기수순", "가입일순", "최근 수정순"] as const;
const ALL = "전체";

export function MemberListPage() {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원 관리" subtitle="SSCC 운영관리시스템" />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <MemberListView />;
}

function MemberListView() {
  const router = useRouter();
  const { mbrs, mbrGrds, mbrSttss, mbrRoleRels } = useMbrStore();
  const roles = useRoleStore((s) => s.roles);
  const [q, setQ] = useState("");
  const [fMbrGrdCd, setFMbrGrdCd] = useState<string>(ALL);
  const [fMbrSttsCd, setFMbrSttsCd] = useState<string>(ALL);
  const [sortIdx, setSortIdx] = useState(0);

  const filtered = useMemo(() => {
    const list = mbrs.filter(
      (m) =>
        (m.mbrNm.includes(q) || m.stdntNo.includes(q)) &&
        (fMbrGrdCd === ALL || m.mbrGrdCd === fMbrGrdCd) &&
        (fMbrSttsCd === ALL || m.mbrSttsCd === fMbrSttsCd),
    );
    const sort = SORTS[sortIdx];
    return [...list].sort((a, b) => {
      if (sort === "이름순") return a.mbrNm.localeCompare(b.mbrNm, "ko");
      if (sort === "기수순") return b.genNo - a.genNo;
      if (sort === "가입일순") return b.joinYmd.localeCompare(a.joinYmd);
      return b.mdfcnDt.localeCompare(a.mdfcnDt);
    });
  }, [mbrs, q, fMbrGrdCd, fMbrSttsCd, sortIdx]);

  const columns: GridColumn<Mbr>[] = [
    {
      key: "mbrNm",
      header: "회원명",
      width: "1.1fr",
      render: (m) => (
        <span className="font-semibold hover:text-accent">{m.mbrNm}</span>
      ),
    },
    {
      key: "stdntNo",
      header: "학생번호",
      width: ".9fr",
      render: (m) => m.stdntNo || <span className="text-n500">학번 미확인</span>,
    },
    { key: "genNo", header: "기수", width: ".5fr", render: (m) => genNoText(m) },
    {
      key: "scsbjtNm",
      header: "학과 · 학년",
      width: "1.2fr",
      render: (m) =>
        isGraduate(m)
          ? `${m.scsbjtNm || "학과 미입력"} · 졸업`
          : `${m.scsbjtNm || "학과 미입력"} · ${m.scyrNo ?? "-"}학년`,
    },
    {
      key: "mbrGrdCd",
      header: "등급",
      width: ".8fr",
      render: (m) => <Badge tone={mbrGrdTone(m.mbrGrdCd)}>{mbrGrdNm(m.mbrGrdCd)}</Badge>,
    },
    {
      key: "mbrSttsCd",
      header: "상태",
      width: ".8fr",
      render: (m) => (
        <Badge tone={mbrSttsTone(m.mbrSttsCd)}>{mbrSttsNm(m.mbrSttsCd)}</Badge>
      ),
    },
    {
      key: "roles",
      header: "현재 역할",
      width: "1.3fr",
      render: (m) =>
        currentRoleRels(mbrRoleRels, m.mbrId)
          .map((r) => roleNmOf(roles, r.roleId))
          .join(", ") || "—",
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
            {filtered.length}명 · 전체 {mbrs.length}명
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
            <Chip active={fMbrGrdCd === ALL} onClick={() => setFMbrGrdCd(ALL)}>
              {ALL}
            </Chip>
            {mbrGrds.map((g) => (
              <Chip
                key={g.mbrGrdCd}
                active={fMbrGrdCd === g.mbrGrdCd}
                onClick={() => setFMbrGrdCd(g.mbrGrdCd)}
              >
                {g.mbrGrdNm}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-[7px]">
            <div className="text-[13px] text-n500">상태</div>
            <Chip active={fMbrSttsCd === ALL} onClick={() => setFMbrSttsCd(ALL)}>
              {ALL}
            </Chip>
            {mbrSttss.map((s) => (
              <Chip
                key={s.mbrSttsCd}
                active={fMbrSttsCd === s.mbrSttsCd}
                onClick={() => setFMbrSttsCd(s.mbrSttsCd)}
              >
                {s.mbrSttsNm}
              </Chip>
            ))}
          </div>
        </div>

        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={filtered}
            rowKey={(m) => String(m.mbrId)}
            onRowClick={(m) => router.push(ROUTES.memberDetail(m.mbrId))}
            empty={
              <EmptyState
                message="조건에 맞는 회원이 없습니다."
                action={{
                  label: "필터 초기화",
                  onClick: () => {
                    setQ("");
                    setFMbrGrdCd(ALL);
                    setFMbrSttsCd(ALL);
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
