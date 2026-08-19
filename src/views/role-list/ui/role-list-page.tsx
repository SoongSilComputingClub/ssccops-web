"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useRoleList } from "@/features/role";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import {
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  Segmented,
  type GridColumn,
} from "@/shared/ui";
import type { RoleSummary } from "@/entities/role";

/*
 * 역할 목록 (/members/roles · #49 · 서버 #79).
 *
 * ── 화면 안에서 권한을 한 번 더 막는다 ──────────────────────────
 * 사이드바의 '역할 관리' 에는 `requires` 가 없다 — 역할·분류 조회가 권한 없이 열려 있다는
 * 전제로 #52 가 그렇게 판단했다. **그 전제가 서버와 어긋난다.** RoleController 는 클래스 전체에
 * `@RequireAuthority(ROLE_MANAGE)` 가 걸려 있어 목록 조회부터 403 이다(VR-M12 · 서버 #79).
 * 목차가 가리키는 곳이 실제로는 닫혀 있는 셈이라, 여기서 가드를 두어 오류 화면 대신 사유를
 * 보여 준다(views/role-authorities 와 같은 방식).
 *
 * 어긋남을 사이드바 쪽에서 고치지 않은 것은 그 판단이 #52 의 것이고 분류 관리 화면
 * (/members/role-labels)은 실제로 권한 없이 열리기 때문이다 — 같은 메뉴 항목이 가리키는 두
 * 화면의 인가가 달라, `requires` 를 붙이면 볼 수 있는 분류 화면까지 목차에서 사라진다.
 * 정리는 역할 조회를 열지(서버) 메뉴를 나눌지(웹)를 정한 뒤에 해야 한다.
 *
 * ── 목 회원 스토어를 세지 않는다 ────────────────────────────────
 * '3명 사용' 은 목록 응답의 `memberCount` 다. 예전에는 화면이 목 회원 스토어의 배정 관계를
 * 훑어 셌는데, 그 배열은 이 브라우저가 들고 있는 목 데이터일 뿐이라 실제 재임자 수와 무관했다.
 */

const ALL = "전체";

const NO_MANAGE =
  "역할을 다룰 권한(ROLE_MANAGE)이 없어 역할 목록을 볼 수 없습니다 — 최고운영자에게 요청해주세요";

export function RoleListPage() {
  const canManageRole = useCan(CAPABILITY.ROLE_MANAGE);

  /*
   * 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다. 이렇게 해야 권한이 없을 때
   * 조회 자체가 나가지 않는다 — 어차피 403 인 요청을 보내고 오류 문구로 덮는 것보다 정직하다.
   */
  if (!canManageRole) {
    return (
      <>
        <PageHeader title="역할 관리" subtitle="역할 목록 · 역할 분류" />
        <PageBody>
          <RoleTabs value="역할 목록" />
          <EmptyState message={NO_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <RoleListView />;
}

function RoleListView() {
  const router = useRouter();
  const list = useRoleList();
  const [filter, setFilter] = useState<string>(ALL);

  /*
   * 분류 필터는 서버 재조회가 아니라 메모리에서 거른다. `GET /v1/roles?roleClsfCd=` 가 있지만
   * 칩을 누를 때마다 왕복하면 "전체 N개" 를 함께 보여 줄 수 없고(필터된 응답에는 전체 수가
   * 없다) 칩 사이를 오갈 때마다 표가 깜빡인다. 역할은 수십 건 규모라 전량을 들고 있어도 된다.
   */
  const filtered = list.roles.filter((r) => filter === ALL || r.roleClsfCd === filter);

  /*
   * 좁은 화면에서 GridTable 은 같은 데이터를 카드로 그린다 (#85 · #96). 표에서는 열이 늘어도
   * 가로로 흡수되지만 카드에서는 세로로 쌓이므로, 카드에서 뜻이 없는 열을 덜어 낸다.
   */
  const columns: GridColumn<RoleSummary>[] = [
    {
      key: "indctSeqno",
      header: FIELD_LABEL.displayOrder,
      width: "80px",
      /* 표시 순번은 목록을 그리는 순서일 뿐이라 카드에서는 위아래 순서가 이미 그것을 말한다 */
      mobileHide: true,
      render: (r) => r.indctSeqno,
    },
    {
      key: "roleNm",
      header: FIELD_LABEL.roleName,
      width: "1fr",
      /* 카드 제목은 첫 열이 기본인데 그 자리가 순번이라, 행을 가리키는 이름을 제목으로 올린다 */
      mobilePrimary: true,
      render: (r) => <span className="font-semibold hover:text-accent">{r.roleNm}</span>,
    },
    /*
     * 분류명은 목록 응답에 실려 온다(roleClsfNm) — 분류 목록과 코드로 짝지을 필요가 없다.
     * 서버가 조인해 내려주는 이유가 이것이다.
     */
    {
      key: "roleClsfNm",
      header: FIELD_LABEL.roleClassification,
      width: "140px",
      render: (r) => r.roleClsfNm,
    },
    {
      key: "memberCount",
      header: "사용 현황",
      width: "160px",
      render: (r) => `${r.memberCount}명 사용`,
    },
    /*
     * 역할별 권한 부여로 가는 유일한 입구다 (#32). 사이드바에 올리지 않은 것은 역할을 먼저
     * 고르지 않으면 갈 수 없는 화면이기 때문이다 — 목차에는 역할 목록만 있으면 된다.
     *
     * 이 화면 자체가 ROLE_MANAGE 로 잠겨 있으므로 여기서 다시 묻지 않는다. 넘기는 roleId 는
     * 이제 서버가 준 값이라 링크가 실제 역할을 가리킨다 — 목 스토어를 쓰던 동안에는 그 보장이
     * 없었다.
     *
     * 행 클릭은 역할 수정으로 가므로 여기서 전파를 끊는다.
     */
    {
      key: "authorities",
      header: "권한",
      width: "90px",
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(ROUTES.roleAuthorities(r.roleId));
          }}
          className="cursor-pointer text-[14px] text-accent"
        >
          권한 부여 ›
        </button>
      ),
    },
    {
      key: "chevron",
      header: "",
      width: "60px",
      align: "right",
      /* 카드는 그 자체가 눌리는 덩어리라 '들어가는 곳'을 화살표로 따로 가리킬 필요가 없다 —
         머리글도 비어 있어 카드에서는 라벨 없는 빈 줄만 남는다 */
      mobileHide: true,
      render: () => <span className="text-n500">›</span>,
    },
  ];

  return (
    <>
      <PageHeader title="역할 관리" subtitle="역할 목록 · 역할 분류" />
      <PageBody>
        {/* 좁은 화면에서는 탭이 한 줄을 다 쓰고 '새 역할'이 다음 줄로 내려간다 —
            lg:flex-nowrap 으로 1024px 이상은 예전처럼 한 줄에 둔다 */}
        <div className="mb-4 flex flex-wrap items-center gap-3 lg:flex-nowrap">
          <RoleTabs value="역할 목록" />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => router.push(ROUTES.roleNew)}
            className="cursor-pointer rounded-[12px] border border-accent bg-accent px-4 py-[9px] text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            + 새 역할
          </button>
        </div>

        {list.status === "loading" && <EmptyState message="불러오는 중…" />}
        {list.status === "error" && (
          <EmptyState
            message={list.errorMessage || "역할을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: list.reload }}
          />
        )}

        {list.status === "ready" && (
          <>
            {/* 분류 칩은 분류 API 가 그린다 — 역할 응답에서 코드를 모아 만들면 역할이 하나도
                없는 분류가 필터에서 사라져, 그 분류가 있다는 것조차 알 수 없게 된다 */}
            <div className="mb-[14px] flex flex-wrap items-center gap-[7px] lg:flex-nowrap">
              <Chip active={filter === ALL} onClick={() => setFilter(ALL)}>
                {ALL}
              </Chip>
              {list.classifications.map((c) => (
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
                {filtered.length}개 역할 · 전체 {list.roles.length}개
              </div>
            </div>

            {list.classificationErrorMessage && (
              <div className="mb-3 text-[13.5px] text-danger">
                {list.classificationErrorMessage}
              </div>
            )}

            {list.roles.length === 0 ? (
              <EmptyState message="등록된 역할이 없습니다." />
            ) : (
              <>
                <Card className="px-5 pt-4 pb-[6px]">
                  <GridTable
                    columns={columns}
                    rows={filtered}
                    rowKey={(r) => String(r.roleId)}
                    onRowClick={(r) => router.push(ROUTES.roleEdit(r.roleId))}
                  />
                </Card>
                <div className="mt-3 text-[13.5px] text-n500">
                  항목을 눌러 상세에서 수정합니다. 사용 현황은 지금 그 역할을 맡고 있는 회원
                  수입니다 — 지난 재임은 세지 않습니다.
                </div>
              </>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}

/** 역할 목록 ↔ 역할 분류. 권한이 없어 목록을 못 여는 사람도 분류는 볼 수 있어 함께 그린다 */
function RoleTabs({ value }: { value: "역할 목록" | "역할 분류" }) {
  const router = useRouter();
  return (
    <Segmented
      options={["역할 목록", "역할 분류"] as const}
      value={value}
      onChange={(v) => {
        if (v !== value) router.push(v === "역할 분류" ? ROUTES.roleLabels : ROUTES.roles);
      }}
      /* 400px 고정은 375px 화면을 넘겨 페이지 전체가 가로로 밀린다 — 좁은 화면에서는
         칸에 맞추고 1024px 이상에서는 예전 폭 그대로 둔다 */
      className="w-full max-w-[400px] lg:w-[400px]"
    />
  );
}
