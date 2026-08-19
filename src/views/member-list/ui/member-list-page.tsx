"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generationText,
  mbrGrdTone,
  mbrSttsTone,
  type MemberSortParam,
  type MemberSummary,
} from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useMemberCodes, useMembers } from "@/features/member";
import { FIELD_LABEL } from "@/shared/config/labels";
import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  Pill,
  SearchInput,
  flash,
  type GridColumn,
} from "@/shared/ui";

/*
 * 회원 명부 (#46 · 서버 #76 · GET /v1/members).
 *
 * 목 스토어(entities/member/model/store.ts)를 화면에서 걸러 그리던 목록을 서버 응답으로
 * 옮겼다. **거르는 일은 전부 서버가 한다** — 검색어·등급·상태·정렬이 질의 파라미터로 나가고
 * 화면은 받은 것을 그대로 그린다. 커서 페이징이라 화면에서 한 번 더 거르면 현재 페이지 밖의
 * 회원이 결과에서 통째로 빠지는데, 명부에서는 그것이 "없는 사람"과 구별되지 않는다.
 *
 * ── 왜 화면 자체를 열지 않는가 (#52) ────────────────────────────
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

/**
 * 정렬 토글 — 화면의 네 축을 서버 `sort` 값에 1:1로 맞춘다.
 *
 * 방향은 축마다 사람이 기대하는 한 쪽으로 고정했다. 이름은 가나다순(오름)이고 나머지 셋은
 * 최근 것이 위(내림)다 — 예전 화면이 클라이언트에서 정렬하던 순서와 같다.
 */
const SORTS: readonly { label: string; param: MemberSortParam }[] = [
  { label: "이름순", param: "mbrNm" },
  { label: "기수순", param: "-genNo" },
  { label: "가입일순", param: "-joinYmd" },
  { label: "최근 수정순", param: "-mdfcnDt" },
];

/** 선택 칩 토글 — 이미 골라 둔 코드를 다시 누르면 뺀다 */
function toggleCode<T extends string>(codes: T[], code: T): T[] {
  return codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code];
}

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

function MemberTableSkeleton() {
  return (
    <Card className="animate-pulse px-5 pt-4 pb-[6px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="border-t border-black/5 py-[13px] first:border-t-0">
          <div className="h-[18px] w-full rounded bg-black/5" />
        </div>
      ))}
    </Card>
  );
}

function MemberListView() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mbrGrdCds, setMbrGrdCds] = useState<MbrGrdCd[]>([]);
  const [mbrSttsCds, setMbrSttsCds] = useState<MbrSttsCd[]>([]);
  const [sortIdx, setSortIdx] = useState(0);

  const { grades, statuses } = useMemberCodes();
  const {
    members,
    status,
    errorMessage,
    totalCount,
    overallCount,
    hasNext,
    loadingMore,
    loadMore,
    reload,
  } = useMembers({ q, mbrGrdCds, mbrSttsCds, sort: SORTS[sortIdx].param });

  const filtered = q.trim() !== "" || mbrGrdCds.length > 0 || mbrSttsCds.length > 0;

  const resetFilters = () => {
    setQ("");
    setMbrGrdCds([]);
    setMbrSttsCds([]);
  };

  const runLoadMore = async () => {
    const message = await loadMore();
    if (message) flash(message);
  };

  const columns: GridColumn<MemberSummary>[] = [
    {
      key: "name",
      header: FIELD_LABEL.memberName,
      width: "1.2fr",
      render: (m) => (
        <span className="flex items-center gap-[6px]">
          <span className="truncate font-semibold hover:text-accent">{m.name}</span>
          {/*
            이관 회원 — 아직 한 번도 로그인하지 않아 계정이 연결되지 않은 사람이다(#85).
            시스템으로 연락이 닿지 않으므로 명부에서 구분되어 보여야 한다. 색을 주지 않는
            것은 문제가 아니라 상태이기 때문이고, 뜻은 title 로 붙인다.
          */}
          {!m.linkedAccount && (
            <span title="아직 로그인한 적이 없는 이관 회원입니다">
              <Pill tone="outline">이관</Pill>
            </span>
          )}
        </span>
      ),
    },
    {
      key: "studentNumber",
      header: FIELD_LABEL.studentNumber,
      width: ".9fr",
      render: (m) => m.studentNumber || <span className="text-n500">학번 미확인</span>,
    },
    {
      key: "generationNumber",
      header: FIELD_LABEL.generationNumber,
      width: ".5fr",
      render: (m) => generationText(m.generationNumber),
    },
    {
      key: "departmentName",
      header: "학과 · 학년",
      width: "1.2fr",
      render: (m) =>
        /* 졸업 여부는 상태 코드에서 파생한다 — 표시 명칭이 바뀌어도 이 분기는 그대로다 */
        m.membershipStatusCode === "GRADUATED"
          ? `${m.departmentName || "학과 미입력"} · 졸업`
          : `${m.departmentName || "학과 미입력"} · ${m.academicYear ?? "-"}학년`,
    },
    {
      key: "membershipGradeCode",
      header: "등급",
      width: ".8fr",
      /* 색은 코드로 고르고 글자는 서버가 준 명칭을 쓴다 (api/members.ts 주석) */
      render: (m) => (
        <Badge tone={mbrGrdTone(m.membershipGradeCode)}>{m.membershipGradeName}</Badge>
      ),
    },
    {
      key: "membershipStatusCode",
      header: "상태",
      width: ".8fr",
      render: (m) => (
        <Badge tone={mbrSttsTone(m.membershipStatusCode)}>{m.membershipStatusName}</Badge>
      ),
    },
    {
      key: "roles",
      header: "현재 역할",
      width: "1.3fr",
      render: (m) => m.roles.map((r) => r.roleName).join(", ") || "—",
    },
  ];

  return (
    <>
      <PageHeader
        title="회원 관리"
        subtitle="SSCC 운영관리시스템"
        /*
          '+ 회원'을 걷어냈다. 운영진이 회원을 직접 만드는 API가 서버에 없기 때문이며(가입은
          본인만 한다), 자세한 근거는 views/member-new 주석에 있다. 대신 명부를 통째로 채우는
          길인 CSV 이관으로 보낸다.
        */
        action={{ label: "CSV 이관", onClick: () => router.push(ROUTES.csvImport) }}
      />
      <PageBody>
        {/*
          검색 · 건수 · 정렬을 lg 미만에서 세로로 쌓는다 — 한 줄에 두면 375px 화면에서
          검색칸(최대 320px)만으로 폭이 차 건수와 정렬 버튼이 밖으로 밀린다.
        */}
        <div className="mb-[14px] flex flex-col gap-[10px] lg:flex-row lg:items-center">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="회원명 · 학생번호"
            className="lg:max-w-[320px] lg:flex-1"
          />
          {/* 밀어내기용 빈 칸 — 세로로 쌓일 때는 높이만 만드는 자리라 접는다 */}
          <div className="hidden flex-1 lg:block" />
          {/*
            건수와 정렬은 좁은 화면에서도 한 줄에 둔다. lg:contents 로 이 상자가 사라지므로
            1024px 이상에서는 두 요소가 예전처럼 바깥 줄의 형제로 놓인다.
          */}
          <div className="flex items-center justify-between gap-[10px] lg:contents">
            {/* 걸린 건수와 전체 건수 모두 서버가 센 값이다 (PageResponse) */}
            <div className="text-[14px] text-n500">
              {status === "ready" ? `${totalCount}명 · 전체 ${overallCount}명` : " "}
            </div>
            <button
              type="button"
              onClick={() => setSortIdx((i) => (i + 1) % SORTS.length)}
              className="cursor-pointer text-[14px] whitespace-nowrap text-accent"
            >
              {SORTS[sortIdx].label} ⇅
            </button>
          </div>
        </div>

        {/* 칩은 기준 코드 API(GET /v1/member-grades · /v1/member-statuses)로 그린다 */}
        <div className="mb-4 flex flex-wrap items-start gap-4">
          <div className="flex flex-wrap items-center gap-[7px]">
            <div className="text-[13px] text-n500">등급</div>
            <Chip active={mbrGrdCds.length === 0} onClick={() => setMbrGrdCds([])}>
              전체
            </Chip>
            {grades.map((g) => (
              <Chip
                key={g.code}
                active={mbrGrdCds.includes(g.code)}
                onClick={() => setMbrGrdCds((codes) => toggleCode(codes, g.code))}
              >
                {g.name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-[7px]">
            <div className="text-[13px] text-n500">상태</div>
            <Chip active={mbrSttsCds.length === 0} onClick={() => setMbrSttsCds([])}>
              전체
            </Chip>
            {statuses.map((s) => (
              <Chip
                key={s.code}
                active={mbrSttsCds.includes(s.code)}
                onClick={() => setMbrSttsCds((codes) => toggleCode(codes, s.code))}
              >
                {s.name}
              </Chip>
            ))}
          </div>
        </div>

        {status === "loading" && <MemberTableSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "회원 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <>
            <Card className="px-5 pt-4 pb-[6px]">
              <GridTable
                columns={columns}
                rows={members}
                rowKey={(m) => String(m.memberId)}
                onRowClick={(m) => router.push(ROUTES.memberDetail(m.memberId))}
                empty={
                  <EmptyState
                    message={
                      filtered
                        ? "조건에 맞는 회원이 없습니다."
                        : "등록된 회원이 없습니다."
                    }
                    /* 필터를 걸지 않았는데 비었다면 초기화할 것도 없다 */
                    action={
                      filtered
                        ? { label: "필터 초기화", onClick: resetFilters }
                        : undefined
                    }
                  />
                }
              />
            </Card>

            {/*
              커서 페이징이라 한 번에 20건까지만 온다. 받아 둔 건수와 걸린 건수를 함께
              보여 주는 것은 '더 보기'가 몇 번 더 남았는지 짐작할 수 있게 하기 위해서다.
            */}
            {hasNext && (
              <div className="mt-5 flex items-center gap-3">
                <Button onClick={() => void runLoadMore()} disabled={loadingMore}>
                  {loadingMore ? "불러오는 중…" : "더 보기"}
                </Button>
                <div className="text-[13.5px] text-n500">
                  {members.length} / {totalCount}명
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
