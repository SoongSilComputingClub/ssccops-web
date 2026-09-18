import { ApiError, apiFetch, apiFetchList, type PageEnvelope, toQuery } from "@/shared/api/client";
import type {
  ContentCategoryCode,
  PublicContentImage,
  PublicContentPage,
  PublicContentPostDetail,
  PublicContentPostSummary,
  PublicOpenForm,
} from "../model/types";
import { isInSemester, type SemesterRange } from "../model/semester";

/*
 * 공개 콘텐츠 API (익명 호출 · 토큰 없음 · #520 · ssccops-server#480 «API 계약 › 익명»).
 *
 * 응답 타입은 서버 record와 **이름·필드가 같다.** `to*` 변환기는 이름을 바꾸지 않고, 없는
 * 값을 만들어 내지 않는 자리로만 둔다(행사 entity와 같은 판단). 서버가 아직 dev에 오르지 않은
 * 채 계약만 보고 만든 것이라, 값 하나가 비어 보이면 서버 브랜치를 먼저 본다(루트 AGENTS «함정»).
 *
 * 익명 응답에는 `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`이 실린다.
 * 그 헤더를 화면 응답에 그대로 잇는 것은 `next.config.ts`의 `headers()`가 한다 — 서버
 * 컴포넌트는 응답 헤더를 만질 수 없고 `apiFetch`도 `data`만 돌려주므로, 같은 값을 경로에
 * 걸어 두는 것이 이 앱에서 «그대로 전달»의 모양이다.
 */

/** 화면이 분기에 쓰는 서버 오류 코드 */
export const CONTENT_ERROR = {
  /** 없거나 게시되지 않은 페이지(초안도 이 코드로 온다) */
  PAGE_NOT_FOUND: "PAGE_NOT_FOUND",
  /** 없거나 게시되지 않은 포스트 */
  POST_NOT_FOUND: "POST_NOT_FOUND",
} as const;

/**
 * «게시된 것이 없다»인가 — 페이지는 «준비 중», 포스트는 404 화면으로 가른다.
 *
 * 코드와 상태를 함께 보는 것은 행사와 같은 이유다 — 프록시가 핸들러 앞에서 봉투 없이 404로
 * 끊으면 코드가 `CLIENT_UNKNOWN_ERROR`로 온다.
 */
export function isContentNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === CONTENT_ERROR.PAGE_NOT_FOUND ||
      error.code === CONTENT_ERROR.POST_NOT_FOUND ||
      error.status === 404)
  );
}

interface PublicContentPageResponse {
  slug: string;
  ttl: string;
  mtxt: string;
  pubDt: string;
}

interface PublicContentPostSummaryResponse {
  slug: string;
  cntntClsfCd: ContentCategoryCode;
  ttl: string;
  smry: string | null;
  actvYmd: string;
  coverFileId: number | null;
  coverImageUrl: string | null;
  pubDt: string;
}

interface PublicContentPostDetailResponse extends PublicContentPostSummaryResponse {
  mtxt: string;
  eventId: number | null;
  gallery: PublicContentImage[];
}

interface PublicOpenFormResponse {
  formKey: string;
  formTtlNm: string;
  rcptEndDt: string | null;
}

function toPage(response: PublicContentPageResponse): PublicContentPage {
  return { ...response };
}

function toPostSummary(response: PublicContentPostSummaryResponse): PublicContentPostSummary {
  return { ...response };
}

function toPostDetail(response: PublicContentPostDetailResponse): PublicContentPostDetail {
  // 갤러리는 배열 계약이지만 비어 있을 때 null로 오는 배포를 만나도 화면이 죽지 않게 한다
  return { ...response, gallery: response.gallery ?? [] };
}

function toOpenForm(response: PublicOpenFormResponse): PublicOpenForm {
  return { ...response };
}

/** 게시된 페이지 한 장. 초안·없음은 404 `PAGE_NOT_FOUND` */
export async function fetchPublicPage(slug: string): Promise<PublicContentPage> {
  const page = await apiFetch<PublicContentPageResponse>(
    `/public/v1/pages/${encodeURIComponent(slug)}`,
  );
  return toPage(page);
}

/** 목록 한 페이지 — 배열과 커서 봉투 */
export interface PublicContentPostPage {
  posts: PublicContentPostSummary[];
  page: PageEnvelope | null;
}

/**
 * 게시된 포스트 목록 — 활동일 역순, 커서 페이징(커서 = 활동일 + id).
 *
 * 공개(익명) 목록이 커서 봉투를 쓰는 첫 자리다 — 행사 목록은 페이징이 없는 계약이었다.
 * `sort`는 보내지 않는다(계약의 쿼리는 `category`·`size`·`cursor` 셋).
 */
export async function fetchPublicPosts(params: {
  category?: ContentCategoryCode | null;
  size?: number;
  cursor?: string | null;
}): Promise<PublicContentPostPage> {
  const { data, page } = await apiFetchList<PublicContentPostSummaryResponse>(
    `/public/v1/posts${toQuery({ category: params.category, size: params.size, cursor: params.cursor })}`,
  );
  return { posts: data.map(toPostSummary), page };
}

/** 게시된 포스트 하나. 초안·없음은 404 `POST_NOT_FOUND` */
export async function fetchPublicPost(slug: string): Promise<PublicContentPostDetail> {
  const post = await apiFetch<PublicContentPostDetailResponse>(
    `/public/v1/posts/${encodeURIComponent(slug)}`,
  );
  return toPostDetail(post);
}

/** 한 학기 조회가 넘기지 않을 페이지 수 — 목록이 활동일 역순이라 보통 두어 장에서 멈춘다 */
const SEMESTER_PAGE_LIMIT = 20;
const SEMESTER_PAGE_SIZE = 50;

/**
 * 한 학기의 포스트 전부 — 학기 필터가 계약에 없어 **웹이 걸러 낸다.**
 *
 * 목록이 활동일 역순이므로 첫 장부터 읽다가 학기 시작일보다 앞선 활동일을 만나면 멈춘다 —
 * 그 뒤는 전부 더 이른 학기다. 학기 뒤(더 최근)의 포스트는 건너뛴다. 페이지 상한은 안전판이다
 * (서버가 `size`를 더 작게 자르면 `page.size`가 그 값이고 커서는 그대로 이어진다).
 */
export async function fetchPublicPostsInSemester(
  range: SemesterRange,
): Promise<PublicContentPostSummary[]> {
  const found: PublicContentPostSummary[] = [];
  let cursor: string | null = null;

  for (let i = 0; i < SEMESTER_PAGE_LIMIT; i += 1) {
    const { posts, page } = await fetchPublicPosts({ size: SEMESTER_PAGE_SIZE, cursor });
    for (const post of posts) {
      if (post.actvYmd < range.start) return found;
      if (isInSemester(post.actvYmd, range)) found.push(post);
    }
    if (!page?.hasNext || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return found;
}

/** 접수 중인 폼 — OPEN이고 기간 안, 시스템 폼 제외, 마감 가까운 순(서버 정렬 그대로) */
export async function fetchOpenForms(): Promise<PublicOpenForm[]> {
  const forms = await apiFetch<PublicOpenFormResponse[]>("/public/v1/forms/open");
  return forms.map(toOpenForm);
}
