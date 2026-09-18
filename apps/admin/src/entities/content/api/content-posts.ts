import type { CntntClsfCd, PubSttsCd } from "@/shared/config/codes";
import { apiFetch, apiFetchList } from "@/shared/lib/api/client";
import type {
  ContentGalleryImage,
  ContentListPage,
  ContentPost,
  ContentPostHistory,
  ContentPostSummary,
} from "../model/types";

/*
 * 콘텐츠 포스트 API (#521 · 서버 ssccops-server#480 «API 계약 › 어드민»).
 * 응답의 모양을 아는 곳은 이 파일 하나다 — 근거는 content-pages.ts.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface ContentPostSummaryResponse {
  postId: number;
  slug: string;
  cntntClsfCd: CntntClsfCd;
  ttl: string;
  actvYmd: string;
  pubSttsCd: PubSttsCd;
  pubDt: string | null;
  mdfcnDt: string;
}

interface ContentGalleryImageResponse {
  fileId: number;
  imageUrl: string;
}

interface ContentPostResponse extends ContentPostSummaryResponse {
  smry: string | null;
  mtxt: string | null;
  eventId: number | null;
  coverFileId: number | null;
  gallery: ContentGalleryImageResponse[] | null;
  mdfcnMbrId: number | null;
  mdfcnMbrNm: string | null;
  regDt: string;
}

interface ContentPostHistoryResponse {
  postHstryId: number;
  cntntClsfCd: CntntClsfCd;
  ttl: string;
  smry: string | null;
  mtxt: string | null;
  actvYmd: string;
  pubSttsCd: PubSttsCd;
  chgMbrId: number | null;
  chgMbrNm: string | null;
  chgDt: string;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toContentPostSummary(res: ContentPostSummaryResponse): ContentPostSummary {
  return {
    postId: res.postId,
    slug: res.slug,
    cntntClsfCd: res.cntntClsfCd,
    ttl: res.ttl,
    actvYmd: res.actvYmd,
    pubSttsCd: res.pubSttsCd,
    pubDt: res.pubDt ?? null,
    mdfcnDt: res.mdfcnDt,
  };
}

function toGalleryImage(res: ContentGalleryImageResponse): ContentGalleryImage {
  return { fileId: res.fileId, imageUrl: res.imageUrl };
}

function toContentPost(res: ContentPostResponse): ContentPost {
  return {
    ...toContentPostSummary(res),
    smry: res.smry ?? null,
    mtxt: res.mtxt ?? "",
    eventId: res.eventId ?? null,
    coverFileId: res.coverFileId ?? null,
    /* 순서는 서버가 정한다(발급 순) — 여기서 다시 정렬하지 않는다 */
    gallery: (res.gallery ?? []).map(toGalleryImage),
    mdfcnMbrId: res.mdfcnMbrId ?? null,
    mdfcnMbrNm: res.mdfcnMbrNm ?? null,
    regDt: res.regDt,
  };
}

function toContentPostHistory(res: ContentPostHistoryResponse): ContentPostHistory {
  return {
    postHstryId: res.postHstryId,
    cntntClsfCd: res.cntntClsfCd,
    ttl: res.ttl,
    smry: res.smry ?? null,
    mtxt: res.mtxt ?? "",
    actvYmd: res.actvYmd,
    pubSttsCd: res.pubSttsCd,
    chgMbrId: res.chgMbrId ?? null,
    chgMbrNm: res.chgMbrNm ?? null,
    chgDt: res.chgDt,
  };
}

/* ── 조회 ──────────────────────────────────────────────────── */

export interface ContentPostListFilter {
  pubSttsCd?: PubSttsCd | null;
  cntntClsfCd?: CntntClsfCd | null;
  cursor?: string | null;
  size?: number;
}

/** GET /v1/content/posts — 목록 (커서 페이징). 파라미터 이름은 서버 계약 그대로 */
export async function fetchContentPosts(
  filter: ContentPostListFilter = {},
): Promise<ContentListPage<ContentPostSummary>> {
  const query = new URLSearchParams();
  if (filter.pubSttsCd) query.set("pubSttsCd", filter.pubSttsCd);
  if (filter.cntntClsfCd) query.set("cntntClsfCd", filter.cntntClsfCd);
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));

  const qs = query.toString();
  const { data, page } = await apiFetchList<ContentPostSummaryResponse>(
    qs ? `/v1/content/posts?${qs}` : "/v1/content/posts",
  );

  return {
    items: data.map(toContentPostSummary),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
  };
}

/** GET /v1/content/posts/{postId} — 단건(갤러리 포함). 없는 포스트는 404 POST_NOT_FOUND */
export async function fetchContentPost(postId: number): Promise<ContentPost> {
  const res = await apiFetch<ContentPostResponse>(`/v1/content/posts/${postId}`);
  return toContentPost(res);
}

/** GET /v1/content/posts/{postId}/history — 스냅샷 이력(최신 먼저). 갤러리·표지·행사는 없다 */
export async function fetchContentPostHistory(postId: number): Promise<ContentPostHistory[]> {
  const res = await apiFetch<ContentPostHistoryResponse[] | null>(
    `/v1/content/posts/${postId}/history`,
  );
  return (res ?? []).map(toContentPostHistory);
}

/* ── 저장 ──────────────────────────────────────────────────── */

/**
 * 포스트 저장 입력 — 생성(POST)과 수정(PATCH)이 같은 본문(`ContentPostSaveRequest`)을 쓴다.
 *
 * 게시 상태 필드가 없다(페이지와 같다). 선택 입력(`smry`·`eventId`·`coverFileId`)도 **전부
 * 싣는다** — PATCH가 통째 교체라 생략하면 지운 것으로 본다.
 *
 * `coverFileId`는 **갤러리 안의 fileId**여야 한다 — 다른 값은 서버가 400 COVER_NOT_IN_GALLERY로
 * 거절한다. 생성 시점에는 갤러리가 없으므로(발급 경로가 `/posts/{postId}/images`) 언제나 null이다.
 */
export interface ContentPostSaveInput {
  slug: string;
  cntntClsfCd: CntntClsfCd;
  ttl: string;
  /** 300자 이하 · 없으면 null */
  smry: string | null;
  mtxt: string;
  /** yyyy-MM-dd — 필수 */
  actvYmd: string;
  eventId: number | null;
  coverFileId: number | null;
}

function toContentPostSaveBody(input: ContentPostSaveInput) {
  return {
    slug: input.slug.trim(),
    cntntClsfCd: input.cntntClsfCd,
    ttl: input.ttl.trim(),
    smry: input.smry,
    mtxt: input.mtxt,
    actvYmd: input.actvYmd,
    eventId: input.eventId,
    coverFileId: input.coverFileId,
  };
}

/** POST /v1/content/posts — 생성 (201 · 항상 초안). 응답으로 곧장 편집 화면에 간다 */
export async function createContentPost(input: ContentPostSaveInput): Promise<ContentPost> {
  const res = await apiFetch<ContentPostResponse>("/v1/content/posts", {
    method: "POST",
    body: JSON.stringify(toContentPostSaveBody(input)),
  });
  return toContentPost(res);
}

/**
 * POST /v1/content/posts/from-event/{eventId} — 행사에서 포스트 만들기 (201 · 본문 없음).
 *
 * **무엇을 복사할지는 서버가 정한다** — 제목·시작일(활동일)·장소·일시·본문을 옮긴 초안이고
 * 분류는 EVENT, `eventId`가 채워진다. slug는 `event-{id}`(겹치면 `-2`…). 화면은 부르고 편집
 * 화면으로 이동하기만 한다(행사 복제와 같은 판단). 없는·지운 행사는 404 EVENT_NOT_FOUND.
 * 같은 행사로 여러 번 부르면 포스트가 여러 건 생긴다 — 서버가 막지 않는다.
 */
export async function createContentPostFromEvent(eventId: number): Promise<ContentPost> {
  const res = await apiFetch<ContentPostResponse>(`/v1/content/posts/from-event/${eventId}`, {
    method: "POST",
  });
  return toContentPost(res);
}

/** PATCH /v1/content/posts/{postId} — 수정. **통째로 교체**다(content-pages.ts의 근거) */
export async function updateContentPost(
  postId: number,
  input: ContentPostSaveInput,
): Promise<ContentPost> {
  const res = await apiFetch<ContentPostResponse>(`/v1/content/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(toContentPostSaveBody(input)),
  });
  return toContentPost(res);
}

/* ── 게시 전이 ─────────────────────────────────────────────── */

/** POST /v1/content/posts/{postId}/publish · /unpublish — 근거는 publishContentPage */
export async function publishContentPost(postId: number, publish: boolean): Promise<ContentPost> {
  const res = await apiFetch<ContentPostResponse>(
    `/v1/content/posts/${postId}/${publish ? "publish" : "unpublish"}`,
    { method: "POST" },
  );
  return toContentPost(res);
}
