/*
 * 공개 콘텐츠 도메인 타입 (#520 · ssccops#382 · ADR-0038).
 *
 * 서버의 익명 응답 record(`Public*Response` — ssccops-server#480 «API 계약 › 익명»)를 **필드
 * 이름 그대로** 옮긴 것이다. 어드민 DTO와 다른 record이고 작성자·수정자·이력·초안은 애초에
 * 실리지 않는다(ADR-0038 표). 응답의 실제 모양을 아는 곳은 `entities/content/api` 하나다.
 */

/** cntnt_clsf_cd — 서버 `ContentCategory` 고정 enum(코드테이블이 아니다) */
export type ContentCategoryCode = "ACADEMIC" | "EVENT" | "NEWS";

/** GET /public/v1/pages/{slug} — 게시된 페이지 한 장 */
/** 접두사 목록의 한 줄 — `GET /public/v1/pages?slugPrefix=` (서버 #513). 본문이 없다 */
export interface PublicContentPageSummary {
  slug: string;
  ttl: string;
  pubDt: string;
}

export interface PublicContentPage {
  slug: string;
  ttl: string;
  /** 본문 (Markdown) — 원시 HTML은 렌더러가 해석하지 않는다 */
  mtxt: string;
  /** 게시일시 — 화면·공유 카드에 싣지 않는다(카드는 한 번 굳는다) */
  pubDt: string;
}

/** GET /public/v1/posts 항목 — 목록 카드가 쓰는 것 */
export interface PublicContentPostSummary {
  slug: string;
  cntntClsfCd: ContentCategoryCode;
  ttl: string;
  /** 요약 — 없으면 null이고 카드는 그 줄을 비운다 */
  smry: string | null;
  /** 활동일 `YYYY-MM-DD` — 목록 정렬 기준이고 학기별 묶음의 기준이다 */
  actvYmd: string;
  coverFileId: number | null;
  /** 표지 이미지 주소 — 없으면 null */
  coverImageUrl: string | null;
  pubDt: string;
}

/** 갤러리 한 장 — 포스트의 파일 목록(`file_rfrnc`)에서 온다 */
export interface PublicContentImage {
  fileId: number;
  imageUrl: string;
}

/** GET /public/v1/posts/{slug} — 목록 항목 + 본문·행사·갤러리 */
export interface PublicContentPostDetail extends PublicContentPostSummary {
  /** 본문 (Markdown) */
  mtxt: string;
  /** 이 포스트가 기록하는 행사 — 있으면 상세가 행사 화면으로 가는 링크를 그린다 */
  eventId: number | null;
  gallery: PublicContentImage[];
}

/** GET /public/v1/forms/open 항목 — 접수 중인 폼의 제목·마감·키만 */
export interface PublicOpenForm {
  /** 폼 키(UUID) — 공개 폼 주소(`/f/{formKey}`)를 만든다 */
  formKey: string;
  formTtlNm: string;
  /** 접수 종료 일시 — 기한 없는 폼은 null */
  rcptEndDt: string | null;
}
