"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BULK_CHANGE_MAX_TARGETS,
  generationText,
  mbrGrdTone,
  mbrSttsTone,
  type MemberSortParam,
  type MemberSummary,
} from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  BulkGradeStatusSheet,
  useMemberCodes,
  useMembers,
  useMemberSelection,
} from "@/features/member";
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
  { label: "전산가입순", param: "-sysJoinYmd" },
  { label: "최근 수정순", param: "-mdfcnDt" },
];

/*
 * 조회 조건과 지금 보는 페이지를 컴포넌트 state가 아니라 URL 쿼리스트링에 둔다
 * (views/form-list와 같은 판단). state로 들고 있으면 회원 상세에 들어갔다 돌아올 때마다
 * 검색어·필터·페이지가 통째로 풀려 명부를 처음부터 다시 뒤져야 한다.
 *
 * ── 페이지를 커서 스택으로 적는다 ──────────────────────────────
 * 커서 페이징에는 페이지 번호가 없다(AP-13 · 서버 PageResponse 주석). 지나온 커서를 `c`로
 * 반복해 실으면 **배열 길이 + 1이 곧 페이지 번호**이고, 마지막 값이 지금 페이지의 커서다.
 * 뒤로 가기는 하나 빼는 것이고, 이 값들이 URL에 있으니 상세 왕복·새로고침·링크 공유가 모두
 * 같은 페이지로 돌아온다.
 *
 * 스택을 화면 state나 sessionStorage에 두지 않은 이유가 그것이다 — 상세에서 돌아오면
 * 컴포넌트가 다시 마운트되므로, URL 밖에 둔 스택은 그 순간 비어 '이전'이 잠긴다.
 */
const QUERY_Q = "q";
const QUERY_GRADE = "mbrGrdCd";
const QUERY_STATUS = "mbrSttsCd";
const QUERY_SORT = "sort";
const QUERY_CURSOR = "c";

/** 검색어 입력이 멎었다고 보는 시간 — 한 글자 더 칠 만한 간격보다 약간 길게 */
const SEARCH_DEBOUNCE_MS = 300;

/** URL은 사용자가 손으로 고칠 수 있다 — 모르는 정렬은 첫 번째로 떨어뜨린다 */
function parseSortIdx(value: string | null): number {
  const idx = SORTS.findIndex((s) => s.param === value);
  return Math.max(0, idx);
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
    <Card className="animate-pulse p-3 lg:px-5 lg:pt-4 lg:pb-[6px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="border-t border-hairline py-[13px] first:border-t-0">
          <div className="h-[18px] w-full rounded bg-fill" />
        </div>
      ))}
    </Card>
  );
}

function MemberListView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get(QUERY_Q) ?? "";
  const mbrGrdCds = searchParams.getAll(QUERY_GRADE) as MbrGrdCd[];
  const mbrSttsCds = searchParams.getAll(QUERY_STATUS) as MbrSttsCd[];
  const sortIdx = parseSortIdx(searchParams.get(QUERY_SORT));
  const cursors = searchParams.getAll(QUERY_CURSOR);

  /*
   * 검색어만 입력칸이 따로 값을 쥔다. 글자마다 URL을 갈면 히스토리가 그만큼 쌓여 뒤로가기가
   * 한 글자씩 지우는 버튼이 되고, 조회도 글자 수만큼 나간다. 멎은 뒤에 replace로 주소만
   * 맞추므로 히스토리는 한 칸도 늘지 않는다.
   */
  const [qInput, setQInput] = useState(q);

  /*
   * 뒤로가기·링크 진입처럼 URL이 바깥에서 바뀌면 입력칸이 그 값을 따라간다.
   *
   * effect가 아니라 **렌더 중에 맞춘다.** effect로 하면 낡은 글자가 한 프레임 그려진 뒤 바뀌고,
   * 그사이 아래 디바운스가 그 낡은 값을 다시 URL로 밀어 뒤로가기가 되돌아온다.
   * (react.dev — "You Might Not Need an Effect"의 prop 변화에 state 맞추기)
   */
  const [syncedQ, setSyncedQ] = useState(q);
  if (syncedQ !== q) {
    setSyncedQ(q);
    setQInput(q);
  }

  const { grades, statuses } = useMemberCodes();
  const {
    members,
    status,
    errorMessage,
    totalCount,
    overallCount,
    hasNext,
    nextCursor,
    size,
    reload,
  } = useMembers({
    q,
    mbrGrdCds,
    mbrSttsCds,
    sort: SORTS[sortIdx].param,
    // 마지막 커서가 지금 페이지의 것이다. 비어 있으면 첫 페이지다
    cursor: cursors.length > 0 ? cursors[cursors.length - 1] : null,
  });

  const filtered = q.trim() !== "" || mbrGrdCds.length > 0 || mbrSttsCds.length > 0;

  /*
   * 일괄 변경의 선택 (#382). 규칙(상한·조건이 바뀌면 비움·이름을 함께 듦)은 훅에 있고 화면은
   * 체크박스와 동작 막대만 그린다 — 근거는 features/member/model/use-member-selection.ts.
   *
   * 열쇠에 커서(`c`)는 넣지 않는다. 페이지를 넘어도 선택이 남아야 하기 때문이며, 그것이 이
   * 기능의 요점이다(1페이지에서 5명, 2페이지에서 10명을 고른 뒤 한 번에 저장한다). 검색어는
   * 디바운스를 마친 URL 값(`q`)이다 — 입력칸의 글자마다 비우면 한 글자 치는 사이에 선택이 날아간다.
   */
  const scopeKey = [q, mbrGrdCds.join(","), mbrSttsCds.join(","), SORTS[sortIdx].param].join("|");
  const selection = useMemberSelection(scopeKey);
  /** 어느 일괄 시트가 열려 있는가 — null이면 닫혀 있다 (상세 화면의 `sheet`와 같은 모양) */
  const [bulkKind, setBulkKind] = useState<"grd" | "stts" | null>(null);

  /*
   * 머리 칸의 «이 페이지 전체 선택». 이 페이지를 다 더했을 때 상한을 넘기면 **잠근다** — 들어가는
   * 만큼만 넣으면 20명을 고르라고 눌렀는데 7명만 체크되어 어느 7명인지는 화면을 훑어야 안다.
   * 전부 골라져 있으면 반대로 이 페이지만 푼다(다른 페이지의 선택은 그대로다).
   */
  const selectedOnPage = members.filter((m) => selection.has(m.memberId)).length;
  const allOnPage = members.length > 0 && selectedOnPage === members.length;
  const unselectedOnPage = members.length - selectedOnPage;
  const pageFits = unselectedOnPage <= selection.remaining;
  const selectAllDisabled = members.length === 0 || (!allOnPage && !pageFits);
  const selectAllTitle = allOnPage
    ? "이 페이지 전체 선택 해제"
    : pageFits
      ? "이 페이지 전체 선택"
      : `한 번에 ${BULK_CHANGE_MAX_TARGETS}명까지 고를 수 있습니다 — 이 페이지를 모두 더하면 ${selection.count + unselectedOnPage}명입니다`;

  const pushParams = (params: URLSearchParams, replace = false) => {
    const qs = params.toString();
    const href = qs ? `${ROUTES.members}?${qs}` : ROUTES.members;
    // scroll:false — 칩만 눌렀는데 맨 위로 튀지 않게 (views/form-list와 같다)
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  };

  /*
   * 조건 축을 바꿀 때는 커서를 **전부 버린다.** 커서는 그 조건 위에서만 뜻이 있어서,
   * 남겨 두면 새 조건의 목록을 옛 조건의 경계에서 잘라 보여주게 된다.
   */
  const applyCondition = (mutate: (params: URLSearchParams) => void, replace = false) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(QUERY_CURSOR);
    mutate(params);
    pushParams(params, replace);
  };

  const toggleParam = (key: string, code: string) => {
    applyCondition((params) => {
      const next = params.getAll(key).includes(code)
        ? params.getAll(key).filter((c) => c !== code)
        : [...params.getAll(key), code];
      params.delete(key);
      for (const c of next) params.append(key, c);
    });
  };

  /* 검색어가 멎으면 주소만 맞춘다 — 값이 그대로면 아무것도 하지 않는다(무한 replace 방지) */
  useEffect(() => {
    if (qInput === q) return;
    const timer = setTimeout(() => {
      applyCondition((params) => {
        if (qInput.trim()) params.set(QUERY_Q, qInput);
        else params.delete(QUERY_Q);
      }, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // applyCondition은 렌더마다 새로 만들어진다 — 값 축만 의존성에 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput, q]);

  const resetFilters = () => {
    setQInput("");
    applyCondition((params) => {
      params.delete(QUERY_Q);
      params.delete(QUERY_GRADE);
      params.delete(QUERY_STATUS);
    });
  };

  const goNext = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.append(QUERY_CURSOR, nextCursor);
    pushParams(params);
  };

  const goPrev = () => {
    if (cursors.length === 0) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(QUERY_CURSOR);
    for (const c of cursors.slice(0, -1)) params.append(QUERY_CURSOR, c);
    pushParams(params);
  };

  /*
   * 몇 번째부터 몇 번째인가. 커서 페이징에는 offset이 없으므로 지나온 페이지 수로 센다 —
   * 마지막 페이지를 뺀 모든 페이지가 가득 차 있다는 것이 이 셈의 전제이고, 커서 페이징이
   * 그것을 지킨다.
   */
  const firstIndex = cursors.length * size + 1;
  const lastIndex = firstIndex + members.length - 1;

  const columns: GridColumn<MemberSummary>[] = [
    {
      key: "name",
      /*
       * 체크박스는 별도 열이 아니라 **이름 열 안**에 둔다 (#382).
       *
       * GridTable은 lg 미만에서 열의 header를 카드의 라벨로 다시 그린다 — 체크박스만 든 열을
       * 하나 더 두면 «전체 선택» 상자가 카드마다 한 번씩 찍히고, 그 카드의 값 칸에는 체크박스가
       * 오른쪽 끝에 홀로 놓인다. 첫 열은 카드의 제목 줄이라 라벨이 그려지지 않으므로, 여기
       * 넣으면 데스크톱에서는 이름 앞의 체크박스이고 카드에서는 제목 앞의 체크박스다. 선택의
       * 뜻이 "이 사람"이니 이름 옆이 자리로도 맞다. GridTable에 선택 전용 API를 더하는 길은
       * 쓰는 화면이 하나뿐이라 접었다.
       *
       * ── 행 클릭과의 충돌 ──────────────────────────────────────
       * `onRowClick`이 셀(데스크톱)·카드(모바일) 전체에 걸려 있어 체크박스의 click이 그대로
       * 올라가면 체크와 동시에 상세로 이동한다. 체크박스를 감싼 span에서 `stopPropagation`으로
       * 끊는다 — input 자체가 아니라 감싼 요소인 것은 **잠긴(disabled) 체크박스** 때문이다.
       * disabled 폼 요소는 자기 click 핸들러를 받지 않지만 요즘 브라우저는 그 클릭을 조상에는
       * 흘려보내므로, input에만 걸어 두면 상한에 닿아 잠긴 상자를 누른 순간 상세로 튄다.
       *
       * GridTable이 "input·button에서 시작한 클릭은 행 클릭이 아니다"라고 일반 규칙으로 거를
       * 수도 있었지만, 공용 표의 동작을 한 화면 때문에 바꾸면 이미 셀 안에 버튼을 둔 다른 목록
       * (CSV 결과의 '회원 보기' 등)의 동작이 함께 달라진다. 끊는 자리를 이 열에 두면 그 판단이
       * 여기에만 갇힌다. 키보드(스페이스)도 click으로 오므로 같은 길로 막힌다.
       */
      header: (
        <span className="flex items-center gap-[10px]">
          <input
            type="checkbox"
            aria-label={selectAllTitle}
            title={selectAllTitle}
            checked={allOnPage}
            disabled={selectAllDisabled}
            /*
              일부만 골라진 상태(indeterminate)는 DOM 속성으로만 켤 수 있다. 콜백 ref는 렌더마다
              불리므로 effect 없이 값이 따라온다.
            */
            ref={(el) => {
              if (el) el.indeterminate = selectedOnPage > 0 && !allOnPage;
            }}
            onChange={() =>
              allOnPage
                ? selection.removeAll(members.map((m) => m.memberId))
                : selection.addAll(members)
            }
            className="size-[16px] flex-none cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-45"
          />
          {FIELD_LABEL.memberName}
        </span>
      ),
      width: "1.2fr",
      render: (m) => {
        const checked = selection.has(m.memberId);
        /* 상한에 닿으면 안 고른 것만 잠근다 — 고른 것은 풀 수 있어야 자리를 비울 수 있다 */
        const locked = !checked && selection.full;
        return (
          <span className="flex items-center gap-[10px]">
            {/*
              행 클릭을 여기서 끊는다 — 근거는 이 열의 첫 주석. 누르는 것은 안의 체크박스이고
              이 span은 울타리일 뿐이라 role="presentation"으로 둔다(#403). 키는 행의
              onKeyActivate가 자기 자신에서 난 것만 받으므로 여기서 끊을 것이 없다.
            */}
            <span
              role="presentation"
              className="flex flex-none"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                aria-label={`${m.name} 선택`}
                checked={checked}
                disabled={locked}
                title={
                  locked
                    ? `한 번에 ${BULK_CHANGE_MAX_TARGETS}명까지 고를 수 있습니다 — 다른 회원의 선택을 풀어주세요`
                    : undefined
                }
                onChange={() => selection.toggle(m)}
                className="size-[16px] cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-45"
              />
            </span>
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
        );
      },
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
            value={qInput}
            onChange={setQInput}
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
              onClick={() =>
                applyCondition((params) =>
                  params.set(QUERY_SORT, SORTS[(sortIdx + 1) % SORTS.length].param),
                )
              }
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
            <Chip
              active={mbrGrdCds.length === 0}
              onClick={() => applyCondition((params) => params.delete(QUERY_GRADE))}
            >
              전체
            </Chip>
            {grades.map((g) => (
              <Chip
                key={g.code}
                active={mbrGrdCds.includes(g.code)}
                onClick={() => toggleParam(QUERY_GRADE, g.code)}
              >
                {g.name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-[7px]">
            <div className="text-[13px] text-n500">상태</div>
            <Chip
              active={mbrSttsCds.length === 0}
              onClick={() => applyCondition((params) => params.delete(QUERY_STATUS))}
            >
              전체
            </Chip>
            {statuses.map((s) => (
              <Chip
                key={s.code}
                active={mbrSttsCds.includes(s.code)}
                onClick={() => toggleParam(QUERY_STATUS, s.code)}
              >
                {s.name}
              </Chip>
            ))}
          </div>
        </div>

        {/*
          동작 막대 — 고른 사람이 있을 때만 나타난다 (#382). 늘 보이면 "0명 선택 · 등급 변경"
          같은 잠긴 줄이 명부 위에 상시 자리를 차지한다. 조회 상태와 무관하게 그린다 — 저장 뒤
          목록이 다시 불리는 동안에도 몇 명이 골라져 있었는지는 남아 있어야 한다.
        */}
        {selection.count > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-[10px] rounded-[12px] bg-accent-soft px-4 py-[10px]">
            <div className="text-[14px] font-medium text-accent">
              {selection.count}명 선택
              {selection.full && (
                <span className="font-normal"> · 한 번에 {BULK_CHANGE_MAX_TARGETS}명까지</span>
              )}
            </div>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setBulkKind("grd")}>
              등급 변경
            </Button>
            <Button size="sm" onClick={() => setBulkKind("stts")}>
              상태 변경
            </Button>
            <Button size="sm" variant="ghost" onClick={selection.clear}>
              선택 해제
            </Button>
          </div>
        )}

        {status === "loading" && <MemberTableSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "회원 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <>
            {/*
              px-5 · pb-[6px]는 표의 행 보더에 맞춘 값이다. lg 미만에서는 GridTable이
              카드 목록으로 바뀌어 그 안쪽에 다시 여백이 생기므로 바깥을 p-3으로 낮춘다 —
              375px 화면에서 카드가 쓸 수 있는 폭이 271px에서 287px로 늘어난다.
            */}
            <Card className="p-3 lg:px-5 lg:pt-4 lg:pb-[6px]">
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
              페이지 번호를 두지 않고 앞뒤 이동만 둔다. 커서 페이징에는 "5페이지"로 바로 갈
              길이 없고(AP-13), 만들려면 앞 페이지를 전부 다시 부르거나 규약을 오프셋으로
              뒤집어야 한다. 대신 커서로 정확히 되는 것 — 앞뒤와 지금 어디인지 — 을 준다.
              특정 회원에 닿는 길은 위의 검색·등급·상태 필터가 더 빠르다.
            */}
            {(cursors.length > 0 || hasNext) && (
              <div className="mt-5 flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  onClick={goPrev}
                  disabled={cursors.length === 0}
                >
                  ◀ 이전
                </Button>
                <div className="text-[13.5px] whitespace-nowrap text-n500">
                  {firstIndex}–{lastIndex} / 전체 {totalCount}명
                </div>
                <Button variant="ghost" onClick={goNext} disabled={!hasNext}>
                  다음 ▶
                </Button>
              </div>
            )}
          </>
        )}
      </PageBody>

      {/*
        저장이 끝나면 목록을 다시 부르고 선택을 비운다. 응답에 회원 상세가 없어 화면을 갈아 끼울
        수 없고(서버가 100명분 상세를 싣지 않기로 했다), 일부만 바뀌었어도 어느 행이 바뀌었는지는
        목록이 말해야 한다. 선택을 비우는 것은 방금 처리한 묶음이 남아 있으면 같은 사람들에게
        한 번 더 누르게 되기 때문이다 — 결과 시트는 응답의 이름으로 그리므로 비워도 남는다.
      */}
      <BulkGradeStatusSheet
        kind={bulkKind}
        targets={selection.selected}
        onClose={() => setBulkKind(null)}
        onSaved={() => {
          reload();
          selection.clear();
        }}
      />
    </>
  );
}
