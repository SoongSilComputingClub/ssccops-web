import type { PubSttsCd } from "@/shared/config/codes";
import { apiFetch, apiFetchList } from "@/shared/lib/api/client";
import type {
  ContentListPage,
  ContentPage,
  ContentPageHistory,
  ContentPageSummary,
} from "../model/types";

/*
 * 콘텐츠 페이지 API (#521 · 서버 ssccops-server#480 «API 계약 › 어드민»).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다**(행사·폼과 같은 판단). 어드민 API
 * 전체가 CONTENT_MANAGE 권한이다(서버 클래스 레벨 판정) — 조회도 포함이라 메뉴 자체를 게이트한다.
 *
 * 공개 응답(`Public*` record)은 여기 없다 — 어드민이 부를 일이 없고, 서버가 두 DTO를 일부러
 * 갈라 둔 것을(ADR-0038) 웹이 한 타입으로 합치면 그 결정이 무너진다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface ContentPageSummaryResponse {
  pageId: number;
  slug: string;
  ttl: string;
  pubSttsCd: PubSttsCd;
  pubDt: string | null;
  mdfcnDt: string;
}

interface ContentPageResponse extends ContentPageSummaryResponse {
  mtxt: string | null;
  mdfcnMbrId: number | null;
  mdfcnMbrNm: string | null;
  regDt: string;
}

interface ContentPageHistoryResponse {
  pageHstryId: number;
  ttl: string;
  mtxt: string | null;
  pubSttsCd: PubSttsCd;
  chgMbrId: number | null;
  chgMbrNm: string | null;
  chgDt: string;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toContentPageSummary(res: ContentPageSummaryResponse): ContentPageSummary {
  return {
    pageId: res.pageId,
    slug: res.slug,
    ttl: res.ttl,
    pubSttsCd: res.pubSttsCd,
    pubDt: res.pubDt ?? null,
    mdfcnDt: res.mdfcnDt,
  };
}

function toContentPage(res: ContentPageResponse): ContentPage {
  return {
    ...toContentPageSummary(res),
    /* 본문은 필수 입력이라 비어 오지 않지만, 편집기가 문자열을 전제하므로 null만 빈 문자열로 */
    mtxt: res.mtxt ?? "",
    mdfcnMbrId: res.mdfcnMbrId ?? null,
    mdfcnMbrNm: res.mdfcnMbrNm ?? null,
    regDt: res.regDt,
  };
}

function toContentPageHistory(res: ContentPageHistoryResponse): ContentPageHistory {
  return {
    pageHstryId: res.pageHstryId,
    ttl: res.ttl,
    mtxt: res.mtxt ?? "",
    pubSttsCd: res.pubSttsCd,
    chgMbrId: res.chgMbrId ?? null,
    chgMbrNm: res.chgMbrNm ?? null,
    chgDt: res.chgDt,
  };
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/** 콘텐츠 API가 돌려주는 오류 코드 (서버 PR #480 본문의 계약) — 페이지·포스트·이미지가 함께 쓴다 */
export const CONTENT_ERROR = {
  /** 404 — 없는 페이지 */
  PAGE_NOT_FOUND: "PAGE_NOT_FOUND",
  /** 404 — 없는 포스트 */
  POST_NOT_FOUND: "POST_NOT_FOUND",
  /** 404 — 갤러리에 없는 이미지 */
  CONTENT_IMAGE_NOT_FOUND: "CONTENT_IMAGE_NOT_FOUND",
  /** 404 — from-event의 없는·지운 행사 */
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  /** 409 — 같은 slug가 이미 있다(페이지·포스트 각자 유일) */
  CONTENT_SLUG_DUPLICATED: "CONTENT_SLUG_DUPLICATED",
  /** 409 — 이미 게시된 것을 또 게시 */
  CONTENT_ALREADY_PUBLISHED: "CONTENT_ALREADY_PUBLISHED",
  /** 409 — 게시되지 않은 것을 게시 취소 */
  CONTENT_NOT_PUBLISHED: "CONTENT_NOT_PUBLISHED",
  /** 400 — 표지로 지목한 fileId가 이 포스트의 갤러리에 없다 */
  COVER_NOT_IN_GALLERY: "COVER_NOT_IN_GALLERY",
  /** 400 — 서버가 허용하지 않는 이미지 형식(png/jpg/webp/gif 밖) */
  UNSUPPORTED_IMAGE_TYPE: "UNSUPPORTED_IMAGE_TYPE",
  /** 400 — 입력 검증 실패(slug 형식·제목 길이·요약 길이·필수 누락) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 413 — 본문 10만 자 초과 */
  CONTENT_TOO_LARGE: "CONTENT_TOO_LARGE",
  /** 413 — 이미지 10MB 초과 */
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
} as const;

/* ── 조회 ──────────────────────────────────────────────────── */

export interface ContentPageListFilter {
  /** 게시 상태 — 없으면(null) 거르지 않는다 */
  pubSttsCd?: PubSttsCd | null;
  cursor?: string | null;
  size?: number;
}

/**
 * GET /v1/content/pages — 목록 (커서 페이징 · `page` 봉투가 필요해 apiFetchList).
 * 쿼리 파라미터 이름은 서버 계약(`pubSttsCd`·`size`·`cursor`) 그대로다.
 */
export async function fetchContentPages(
  filter: ContentPageListFilter = {},
): Promise<ContentListPage<ContentPageSummary>> {
  const query = new URLSearchParams();
  if (filter.pubSttsCd) query.set("pubSttsCd", filter.pubSttsCd);
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));

  const qs = query.toString();
  const { data, page } = await apiFetchList<ContentPageSummaryResponse>(
    qs ? `/v1/content/pages?${qs}` : "/v1/content/pages",
  );

  return {
    items: data.map(toContentPageSummary),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
  };
}

/** GET /v1/content/pages/{pageId} — 단건. 없는 페이지는 404 PAGE_NOT_FOUND */
export async function fetchContentPage(pageId: number): Promise<ContentPage> {
  const res = await apiFetch<ContentPageResponse>(`/v1/content/pages/${pageId}`);
  return toContentPage(res);
}

/** GET /v1/content/pages/{pageId}/history — 스냅샷 이력(최신 먼저) */
export async function fetchContentPageHistory(pageId: number): Promise<ContentPageHistory[]> {
  const res = await apiFetch<ContentPageHistoryResponse[] | null>(
    `/v1/content/pages/${pageId}/history`,
  );
  return (res ?? []).map(toContentPageHistory);
}

/* ── 저장 ──────────────────────────────────────────────────── */

/**
 * 페이지 저장 입력 — 생성(POST)과 수정(PATCH)이 같은 본문(`ContentPageSaveRequest`)을 쓴다.
 *
 * **게시 상태 필드가 없다.** 생성은 항상 초안이고 게시·게시 취소는 별도 전이 API의 몫이다 —
 * 저장 한 번이 게시 상태를 덮어쓰는 사고를 계약 차원에서 막았다(행사·폼과 같은 판단).
 */
export interface ContentPageSaveInput {
  slug: string;
  /** 200자 이하 */
  ttl: string;
  /** 본문 Markdown — 필수 */
  mtxt: string;
}

function toContentPageSaveBody(input: ContentPageSaveInput) {
  return { slug: input.slug.trim(), ttl: input.ttl.trim(), mtxt: input.mtxt };
}

/** POST /v1/content/pages — 생성 (201 · 항상 초안). 응답으로 곧장 편집 화면에 간다 */
export async function createContentPage(input: ContentPageSaveInput): Promise<ContentPage> {
  const res = await apiFetch<ContentPageResponse>("/v1/content/pages", {
    method: "POST",
    body: JSON.stringify(toContentPageSaveBody(input)),
  });
  return toContentPage(res);
}

/**
 * PATCH /v1/content/pages/{pageId} — 수정.
 *
 * 메서드가 PATCH지만 **통째로 교체**다(서버 F2 결정) — 세 필드가 전부 필수라 부분 본문을 보낼
 * 길이 없다. 화면은 현재 값을 전부 입력란에 채우고 그대로 다시 보낸다(AGENTS.md «서버의 PATCH는
 * 대개 전체 교체다»). MCP의 `update_page`가 읽고-합치기를 하는 것은 서버 쪽 일이다.
 */
export async function updateContentPage(
  pageId: number,
  input: ContentPageSaveInput,
): Promise<ContentPage> {
  const res = await apiFetch<ContentPageResponse>(`/v1/content/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify(toContentPageSaveBody(input)),
  });
  return toContentPage(res);
}

/* ── 게시 전이 ─────────────────────────────────────────────── */

/**
 * POST /v1/content/pages/{pageId}/publish · /unpublish — 본문 없음.
 *
 * 다음 상태가 아니라 **동작**을 보낸다(행사 상태 전이와 같은 판단). 같은 상태로 다시 전이하면
 * 409(CONTENT_ALREADY_PUBLISHED · CONTENT_NOT_PUBLISHED) — 화면이 낡았다는 뜻이라 다시 부른다.
 * 공개 화면은 `s-maxage=300`이라 게시·취소가 **최대 5분** 늦게 보인다 — 버튼 옆 한 줄의 근거.
 */
export async function publishContentPage(pageId: number, publish: boolean): Promise<ContentPage> {
  const res = await apiFetch<ContentPageResponse>(
    `/v1/content/pages/${pageId}/${publish ? "publish" : "unpublish"}`,
    { method: "POST" },
  );
  return toContentPage(res);
}

/**
 * 페이지 전부 — 카탈로그 화면(#534)이 슬러그로 짝지으려고 커서 끝까지 읽는다. 페이지는 카탈로그
 * 항목 13 + 기수 몇 장이라 두세 번이면 끝난다(목록 상한 100). 포스트에는 이런 것을 두지 않는다.
 */
/*
 * 커서 순회 상한 (#687 · ssccops#505).
 *
 * 서버가 `hasNext: true`를 주면서 `nextCursor`를 전진시키지 못하는 순간 이 루프는 끝나지
 * 않는다 — 페이징 버그 한 건이면 되고, 이 레포는 이미 #305에서 계약 불일치를 겪었다.
 * **같은 버그가 두 플랫폼에서 다른 얼굴로 나온다**: dev(Cloudflare)는 CPU 한도로 1102,
 * prod(Vercel)는 함수 타임아웃이다.
 *
 * 이 레포에 이미 옳은 모양이 셋 있다 — `use-academic-program-dashboard`의 `guard < 20`,
 * `public-content`의 `SEMESTER_PAGE_LIMIT = 20`, `sitemap`의 `POST_CAP`.
 */
const MAX_PAGE_FETCHES = 20;

export async function fetchAllContentPages(): Promise<ContentPageSummary[]> {
  const all: ContentPageSummary[] = [];
  let cursor: string | null = null;
  for (let fetched = 0; fetched < MAX_PAGE_FETCHES; fetched += 1) {
    const page: ContentListPage<ContentPageSummary> = await fetchContentPages({ cursor, size: 100 });
    all.push(...page.items);
    cursor = page.hasNext ? page.nextCursor : null;
    if (!cursor) break;
  }
  // 상한에 걸려도 모은 것을 돌려준다 — 카탈로그가 통째로 비는 것보다 낫고,
  // 페이지가 2,000장을 넘는 일은 없으므로 여기 닿는 것 자체가 계약이 깨졌다는 신호다.
  return all;
}
