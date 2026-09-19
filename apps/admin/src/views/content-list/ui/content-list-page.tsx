"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cntntClsfLabel, pubSttsBadge, type ContentPostSummary } from "@/entities/content";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { NO_CONTENT_MANAGE, useContentPostList, type ContentList } from "@/features/content";
import { PUB_STTS_CDS, PUB_STTS_NM, type PubSttsCd } from "@/shared/config/codes";
import { CONTENT_TAB_QUERY, ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  FilterBar,
  PageBody,
  PageHeader,
  Pill,
  Segmented,
  flash,
} from "@/shared/ui";
import { PageCatalog } from "./page-catalog";

/*
 * 콘텐츠 목록 (#521 · GET /v1/content/pages · GET /v1/content/posts).
 *
 * 페이지·포스트가 **한 화면의 탭**이다 — 두 자원이 같은 권한 하나(CONTENT_MANAGE)로 잠기고, 홍보국이
 * «오늘 쓸 것»을 고르는 자리가 한 곳이어야 해서다(routes.ts 주석). 탭과 상태 필터는 URL 쿼리에
 * 둔다(새로고침·뒤로가기·링크 공유 — 폼·행사 목록과 같은 판단). 상태 파라미터 이름은 서버 쿼리와
 * 같은 `pubSttsCd`다.
 *
 * 상세 화면이 따로 없다 — 제목을 누르면 곧장 편집이다(행사와 같다). 삭제는 없다(서버에 없다).
 *
 * **페이지 탭은 서버 목록이 아니라 카탈로그다**(#534 · ssccops#392 · `PageCatalog`) — www 라우트 표의
 * 자리마다 «없음/초안/게시». 그래서 페이지 탭에는 상태 필터 칩도 «페이지 만들기» 버튼도 없다.
 * 포스트 탭은 그대로 서버 목록(날짜순 컬렉션 · 자유 생성).
 */

const TABS = ["페이지", "포스트"] as const;
type Tab = (typeof TABS)[number];
const TAB_QUERY_VALUE: Record<Tab, "pages" | "posts"> = { 페이지: "pages", 포스트: "posts" };

const ALL = "전체";
const QUERY_STATUS = "pubSttsCd";

function parseTab(value: string | null): Tab {
  return value === "posts" ? "포스트" : "페이지";
}

/* URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음(전체)으로 떨어뜨린다 */
function parseStatus(value: string | null): PubSttsCd | null {
  return value && PUB_STTS_CDS.includes(value as PubSttsCd) ? (value as PubSttsCd) : null;
}

function RowSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[20px] w-3/5 rounded bg-fill" />
      <div className="mt-2 h-[14px] w-2/5 rounded bg-fill" />
    </Card>
  );
}

/** 목록 한 줄 — 페이지·포스트가 같은 틀을 쓰고 부제만 다르다 */
function ContentRow({
  title,
  pubSttsCd,
  subtitle,
  category,
  onOpen,
}: Readonly<{
  title: string;
  pubSttsCd: PubSttsCd;
  subtitle: string;
  category?: string;
  onOpen: () => void;
}>) {
  const stts = pubSttsBadge(pubSttsCd);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stts.tone}>{stts.label}</Badge>
        {category && <Pill tone="outline">{category}</Pill>}
      </div>
      {/* 키보드 접근(#403) — 제목이 곧 편집으로 가는 길이다 */}
      <button
        type="button"
        onClick={onOpen}
        className="mt-2 block w-full cursor-pointer text-left text-[17px] leading-[1.35] font-semibold hover:text-accent"
      >
        {title}
      </button>
      <div className="mt-1 text-[13.5px] text-n500">{subtitle}</div>
    </Card>
  );
}

function ListBody<T>({
  list,
  render,
  emptyMessage,
}: Readonly<{
  list: ContentList<T>;
  render: (item: T) => ReactNode;
  emptyMessage: string;
}>) {
  const runLoadMore = async () => {
    const message = await list.loadMore();
    if (message) flash(message);
  };

  if (list.status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-3">
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }
  if (list.status === "error") {
    return <EmptyState message={list.errorMessage} action={{ label: "다시 시도", onClick: list.reload }} />;
  }
  if (list.items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-3">{list.items.map(render)}</div>
      {/* 커서 페이징 — 페이지네이터 대신 «더 보기» (AGENTS.md) */}
      {list.hasNext && (
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={() => void runLoadMore()} disabled={list.loadingMore}>
            {list.loadingMore ? "불러오는 중…" : "더 보기"}
          </Button>
          <div className="text-[13.5px] text-n500">
            {list.items.length} / {list.totalCount}건
          </div>
        </div>
      )}
    </>
  );
}

function PostsPanel({ pubSttsCd }: Readonly<{ pubSttsCd: PubSttsCd | null }>) {
  const router = useRouter();
  const list = useContentPostList(pubSttsCd);
  return (
    <ListBody
      list={list}
      emptyMessage="아직 포스트가 없습니다."
      render={(post: ContentPostSummary) => (
        <ContentRow
          key={post.postId}
          title={post.ttl}
          pubSttsCd={post.pubSttsCd}
          category={cntntClsfLabel(post.cntntClsfCd)}
          subtitle={`활동일 ${post.actvYmd} · /${post.slug} · 수정 ${formatDt(post.mdfcnDt)}`}
          onOpen={() => router.push(ROUTES.contentPostEdit(post.postId))}
        />
      )}
    />
  );
}

export function ContentListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canManage = useCan(CAPABILITY.CONTENT_MANAGE);

  const tab = parseTab(searchParams.get(CONTENT_TAB_QUERY));
  const pubSttsCd = parseStatus(searchParams.get(QUERY_STATUS));

  const setQuery = (nextTab: Tab, nextStatus: PubSttsCd | null) => {
    const query = new URLSearchParams();
    query.set(CONTENT_TAB_QUERY, TAB_QUERY_VALUE[nextTab]);
    if (nextStatus) query.set(QUERY_STATUS, nextStatus);
    router.replace(`${ROUTES.content}?${query.toString()}`);
  };

  const isPages = tab === "페이지";

  return (
    <>
      <PageHeader
        title="콘텐츠"
        subtitle="공개 사이트의 페이지와 포스트"
        action={
          isPages
            ? undefined
            : {
                label: "포스트 만들기",
                onClick: () => router.push(ROUTES.contentPostNew),
                disabled: !canManage,
                title: canManage ? undefined : NO_CONTENT_MANAGE,
              }
        }
      />
      <PageBody>
        <Segmented
          options={TABS}
          value={tab}
          onChange={(next) => setQuery(next, pubSttsCd)}
          className="mb-4 w-[220px]"
        />
        {!isPages && (
          <FilterBar>
            <Chip active={pubSttsCd === null} onClick={() => setQuery(tab, null)}>
              {ALL}
            </Chip>
            {PUB_STTS_CDS.map((cd) => (
              <Chip key={cd} active={pubSttsCd === cd} onClick={() => setQuery(tab, cd)}>
                {PUB_STTS_NM[cd]}
              </Chip>
            ))}
          </FilterBar>
        )}
        {isPages ? <PageCatalog canManage={canManage} /> : <PostsPanel pubSttsCd={pubSttsCd} />}
      </PageBody>
    </>
  );
}
