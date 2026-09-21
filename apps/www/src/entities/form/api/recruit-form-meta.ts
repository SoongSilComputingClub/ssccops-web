import { apiFetch } from "@/shared/api/client";
import { RECRUIT_SYS_FORM_CD } from "../model/system-form-code";

/*
 * 신입회원 모집 지정 폼 메타 (#588 · ssccops#436 · ADR-0044 · 서버 #520 ·
 * GET /public/v1/forms/system/RECRUIT/meta · 익명).
 *
 * `/join`이 «지원하기» CTA를 그리는 재료다 — 링크를 만들 폼 키, 제목, 접수 상태와 기간. 접수
 * 상태는 서버가 계산한 파생값(`receiptStatus`)이고 **웹이 기간으로 다시 계산하지 않는다**(어드민
 * 폼 배지와 같은 규칙).
 *
 * ── 왜 `/public/v1/forms/open`이 아닌가 ─────────────────────────
 * 그 목록은 시스템 폼을 일부러 뺀다(ADR-0038 — 기획안이 뜨면 로그인 벽). 모집 폼도 시스템 폼이라
 * 거기 없고, 있다 해도 QA·행사 폼과 섞여 «어느 것이 신입 모집인가»를 가를 수 없다(#529에서
 * `OpenForms` 블록을 뺀 이유). 이 경로는 «모집 페이지가 가리키는 폼 하나»만 답한다.
 *
 * ── 없음은 null ─────────────────────────────────────────────────
 * 아직 지정된 폼이 없거나, 지정됐지만 접수를 연 적이 없으면(DRAFT) 서버가 404다 — 그때 `/join`은
 * CTA 없이 본문만 그린다. 조회 실패(서버가 잠깐 닿지 않음)도 같은 결과로 떨어뜨린다: 공개 도메인이
 * 이 블록 하나 때문에 오류 문구를 세우는 것보다 CTA가 잠깐 없는 편이 낫다(OG 메타 조회와 같은
 * 저울). `ContentPage`가 같은 화면 안에서 본문 조회 실패를 따로 안내하므로 서버가 죽었다는 사실은
 * 그쪽이 말한다.
 *
 * 캐시는 `apiFetch`(no-store) 그대로다 — `/join` 응답 자체에 `next.config.ts`가 5분 `Cache-Control`을
 * 건다(ADR-0038 · www AGENTS «익명 콘텐츠 화면의 Cache-Control»). 페이지 레벨 ISR·`revalidate`는
 * 두 플랫폼 규칙이 막는다(루트 AGENTS «배포 — 두 플랫폼»).
 */

/** 서버 `FormReceiptStatus` — 서버 `FormReceiptPolicy`가 계산한 값 그대로 */
export type RecruitReceiptStatus = "DRAFT" | "SCHEDULED" | "ACCEPTING" | "EXPIRED" | "CLOSED";

interface RecruitFormMetaResponse {
  formKey: string | null;
  formTtlNm: string | null;
  receiptStatus: RecruitReceiptStatus | null;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
}

export interface RecruitFormMeta {
  /** 폼 키(UUID) — 공개 폼 주소(`/f/{formKey}`)를 만든다 */
  formKey: string;
  formTtlNm: string;
  receiptStatus: RecruitReceiptStatus;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
}

/**
 * 지정된 신입회원 모집 폼의 메타. 지정된 폼이 없거나(404) 조회에 실패하면 `null`이다.
 *
 * 키나 상태가 빠진 응답도 `null`이다 — 키 없이는 링크를 만들 수 없고, 상태 없이는 «지원하기»인지
 * «n월 n일부터»인지 가를 수 없어 CTA를 그릴 재료가 아니다(없는 값을 지어내지 않는다).
 */
export async function fetchRecruitFormMeta(): Promise<RecruitFormMeta | null> {
  try {
    const res = await apiFetch<RecruitFormMetaResponse>(
      `/public/v1/forms/system/${RECRUIT_SYS_FORM_CD}/meta`,
    );
    if (!res.formKey || !res.receiptStatus) return null;
    return {
      formKey: res.formKey,
      formTtlNm: res.formTtlNm?.trim() || "",
      receiptStatus: res.receiptStatus,
      rcptBgngDt: res.rcptBgngDt,
      rcptEndDt: res.rcptEndDt,
    };
  } catch {
    /*
     * 404(미지정·DRAFT)와 그 밖의 실패를 가르지 않는다 — 어느 쪽이든 화면이 할 일은 «CTA 없음»
     * 하나다. 가르려 들면 이 블록이 오류 분기를 갖게 되는데, 그 분기가 그릴 것이 없다.
     */
    return null;
  }
}
