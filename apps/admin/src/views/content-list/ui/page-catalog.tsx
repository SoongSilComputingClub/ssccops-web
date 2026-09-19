"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isCohort, operatorsCohortPath, operatorsCohortSlug } from "@ssccops/content";
import { pubSttsBadge, type ContentPageSummary } from "@/entities/content";
import { NO_CONTENT_MANAGE, useContentCatalog, type CatalogRow } from "@/features/content";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { Badge, Button, Card, EmptyState, SectionLabel, TextField } from "@/shared/ui";

/*
 * 페이지 카탈로그 (#534 · ssccops#392) — «콘텐츠 › 페이지» 탭.
 *
 * 서버 목록이 아니라 **www 라우트 표**(`@ssccops/content`)가 목록이다. 줄마다 그 자리에 무엇이 있는지
 * («없음 / 초안 / 게시»)를 보이고, 누르면 편집으로 — 없으면 그 슬러그로 만들기 화면(첫 저장이
 * 생성)이다. «페이지 만들기» 버튼과 슬러그 입력은 없다: 표에 없는 이름으로 만든 페이지는 공개
 * 사이트 어디에도 나타나지 않으므로, 만들 수 있는 것은 표의 자리뿐이다. 새 페이지 종류는 코드
 * (패키지 표 + www 라우트)가 정한다 — 페이지 구성은 FE와 함께 가는 정형 구조다.
 *
 * 예외는 기수 운영진(`operators-{n}`) — 슬러그 패턴이라 «기수 추가»에 숫자 하나만 받는다.
 * 서버에 있지만 표에 없는 페이지는 «표에 없는 페이지» 절에 — 숨기지 않되 어디에도 안 나타난다고
 * 적는다(지우는 API는 없다).
 */

function PageRow({
  title,
  page,
  path,
  note,
  onOpen,
}: Readonly<{
  title: string;
  page: ContentPageSummary | null;
  path: string;
  note?: string;
  onOpen: () => void;
}>) {
  const stts = page ? pubSttsBadge(page.pubSttsCd) : null;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        {stts ? <Badge tone={stts.tone}>{stts.label}</Badge> : <Badge tone="grey">없음</Badge>}
        <span className="text-[13px] text-n500">{path}</span>
      </div>
      {/* 키보드 접근(#403) — 제목이 곧 편집으로 가는 길이다 */}
      <button
        type="button"
        onClick={onOpen}
        className="mt-2 block w-full cursor-pointer text-left text-[17px] leading-[1.35] font-semibold hover:text-accent"
      >
        {page?.ttl ?? title}
      </button>
      <div className="mt-1 text-[13.5px] text-n500">
        {page ? `수정 ${formatDt(page.mdfcnDt)}` : "아직 쓰지 않았습니다"}
        {note && ` · ${note}`}
      </div>
    </Card>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[20px] w-3/5 rounded bg-fill" />
          <div className="mt-2 h-[14px] w-2/5 rounded bg-fill" />
        </Card>
      ))}
    </div>
  );
}

/** 기수 추가 — 숫자 하나. 이미 있는 기수면 편집으로, 없으면 그 슬러그로 만들기 화면 */
function CohortAdd({
  existing,
  canManage,
}: Readonly<{ existing: Map<number, ContentPageSummary>; canManage: boolean }>) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const valid = isCohort(value.trim());
  const go = () => {
    const cohort = Number(value.trim());
    const page = existing.get(cohort);
    router.push(page ? ROUTES.contentPageEdit(page.pageId) : ROUTES.contentPageNew(operatorsCohortSlug(cohort)));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="기수 (예: 45)"
        inputMode="numeric"
        className="w-[140px]"
      />
      <Button onClick={go} disabled={!valid || !canManage} title={canManage ? undefined : NO_CONTENT_MANAGE}>
        기수 페이지 열기
      </Button>
      <span className="text-[12.5px] text-n500">주소는 /operators/기수 입니다</span>
    </div>
  );
}

export function PageCatalog({ canManage }: Readonly<{ canManage: boolean }>) {
  const router = useRouter();
  const { catalog, status, errorMessage, reload } = useContentCatalog();

  if (status === "loading" || !catalog) {
    if (status === "error") {
      return <EmptyState message={errorMessage} action={{ label: "다시 시도", onClick: reload }} />;
    }
    return <CatalogSkeleton />;
  }

  const open = (row: CatalogRow) =>
    router.push(
      row.page ? ROUTES.contentPageEdit(row.page.pageId) : ROUTES.contentPageNew(row.entry.slug),
    );
  const cohortPages = new Map(catalog.cohorts.map((c) => [c.cohort, c.page]));

  return (
    <div className="flex flex-col gap-6">
      {catalog.groups.map((group) => (
        <section key={group.group}>
          <SectionLabel className="mb-3">{group.label}</SectionLabel>
          <div className="grid grid-cols-1 gap-3">
            {group.rows.map((row) => (
              <PageRow
                key={row.entry.slug}
                title={row.entry.title}
                page={row.page}
                path={row.entry.path}
                note={row.entry.note}
                onOpen={() => open(row)}
              />
            ))}
            {group.group === "operators" && (
              <>
                {catalog.cohorts.map((c) => (
                  <PageRow
                    key={c.page.pageId}
                    title={`${c.cohort}기 운영진`}
                    page={c.page}
                    path={operatorsCohortPath(c.cohort)}
                    onOpen={() => router.push(ROUTES.contentPageEdit(c.page.pageId))}
                  />
                ))}
                <Card>
                  <div className="mb-2 text-[13.5px] text-n300">역대 운영진 — 기수마다 한 페이지입니다.</div>
                  <CohortAdd existing={cohortPages} canManage={canManage} />
                </Card>
              </>
            )}
          </div>
        </section>
      ))}

      {catalog.extras.length > 0 && (
        <section>
          <SectionLabel className="mb-1">표에 없는 페이지</SectionLabel>
          <div className="mb-3 text-[13.5px] text-n500">
            공개 사이트 어디에도 나타나지 않습니다. 내용을 옮기려면 위 자리 중 하나에 쓰세요.
          </div>
          <div className="grid grid-cols-1 gap-3">
            {catalog.extras.map((page) => (
              <PageRow
                key={page.pageId}
                title={page.ttl}
                page={page}
                path={`/${page.slug}`}
                onOpen={() => router.push(ROUTES.contentPageEdit(page.pageId))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
