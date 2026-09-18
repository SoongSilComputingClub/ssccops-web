import type { CntntClsfCd, PubSttsCd } from "@/shared/config/codes";

/*
 * 콘텐츠 도메인 타입 (#521 · ssccops#383 · 서버 ssccops-server#480 · ADR-0038).
 *
 * 홍보국이 공개 사이트에 싣는 **페이지**(소개·연혁 같은 고정 글)와 **포스트**(활동 기록·소식)다.
 * 서버가 둘을 한 테이블로 합치지 않았으므로 여기서도 타입을 합치지 않는다 — 포스트에만
 * 분류·활동일·요약·행사 연결·갤러리가 있다.
 *
 * 응답의 실제 모양을 아는 곳은 entities/content/api 하나로 제한하고(행사·폼과 같은 판단),
 * 화면은 아래 도메인 타입만 본다. 필드 이름은 서버 record 그대로다(`ttl`·`mtxt`·`smry`·
 * `actvYmd`) — 데이터사전 표준 단어를 그대로 옮긴 값이라 여기서 풀어 쓰지 않는다.
 */

/** GET /v1/content/pages 항목 — 목록이 쓰는 것만(본문은 상세에만 온다) */
export interface ContentPageSummary {
  pageId: number;
  /** 공개 주소의 마지막 조각 — 소문자·숫자·하이픈 80자 이하(서버 ContentSlug) */
  slug: string;
  ttl: string;
  pubSttsCd: PubSttsCd;
  /** 게시 일시 — 초안이면 null */
  pubDt: string | null;
  mdfcnDt: string;
}

/** GET /v1/content/pages/{pageId} — 목록 항목 + 본문 + 마지막 수정자 */
export interface ContentPage extends ContentPageSummary {
  /** 본문 Markdown(10만 자 상한 — 초과는 서버가 413 CONTENT_TOO_LARGE로 거절) */
  mtxt: string;
  mdfcnMbrId: number | null;
  mdfcnMbrNm: string | null;
  regDt: string;
}

/**
 * GET /v1/content/pages/{pageId}/history 항목 — 변경 뒤 **전체 스냅샷** 한 줄(최신 먼저).
 *
 * 생성·수정·게시·게시 취소마다 한 행이다. 무엇이 바뀌었는지는 실리지 않는다 — 두 스냅샷을
 * 나란히 놓고 보는 것은 화면의 몫이고, 이번 화면은 제목·상태·누가·언제까지만 보인다.
 */
export interface ContentPageHistory {
  pageHstryId: number;
  ttl: string;
  mtxt: string;
  pubSttsCd: PubSttsCd;
  chgMbrId: number | null;
  chgMbrNm: string | null;
  chgDt: string;
}

/** GET /v1/content/posts 항목 */
export interface ContentPostSummary {
  postId: number;
  slug: string;
  cntntClsfCd: CntntClsfCd;
  ttl: string;
  /** 활동_일자(yyyy-MM-dd) — 공개 목록의 정렬 기준이다 */
  actvYmd: string;
  pubSttsCd: PubSttsCd;
  pubDt: string | null;
  mdfcnDt: string;
}

/** 갤러리 한 장 — `imageUrl`은 서버의 영구 리다이렉트 주소라 본문에 굳혀도 된다 */
export interface ContentGalleryImage {
  fileId: number;
  imageUrl: string;
}

/** GET /v1/content/posts/{postId} */
export interface ContentPost extends ContentPostSummary {
  /** 요약 — 공개 목록 카드에 나온다. 300자 이하, 없으면 null */
  smry: string | null;
  mtxt: string;
  /** 연결 행사 — 없으면 null. 행사에서 만든 포스트(from-event)는 서버가 채운다 */
  eventId: number | null;
  /**
   * 표지 — **갤러리 안의 fileId만** 될 수 있다(서버 400 COVER_NOT_IN_GALLERY). 갤러리에서 그
   * 장을 지우면 서버가 표지도 함께 비운다.
   */
  coverFileId: number | null;
  /** 발급 순서 고정 — 정렬 컬럼이 없어 화면이 순서를 바꾸지 않는다 */
  gallery: ContentGalleryImage[];
  mdfcnMbrId: number | null;
  mdfcnMbrNm: string | null;
  regDt: string;
}

/** GET /v1/content/posts/{postId}/history 항목 — 갤러리·표지·행사는 이력에 없다 */
export interface ContentPostHistory {
  postHstryId: number;
  cntntClsfCd: CntntClsfCd;
  ttl: string;
  smry: string | null;
  mtxt: string;
  actvYmd: string;
  pubSttsCd: PubSttsCd;
  chgMbrId: number | null;
  chgMbrNm: string | null;
  chgDt: string;
}

/** 커서 목록 한 페이지 — 페이지·포스트가 같은 봉투를 쓴다 */
export interface ContentListPage<T> {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
}
