/*
 * 공개 폼 미리보기용 메타 조회 (ssccops#201 · ssccops-server#247).
 *
 * **이 앱의 클라이언트(`shared/api`)를 쓰지 않는다.** 그쪽은 봉투를 벗기고 `ApiError`로
 * 세우며 인증 계열은 토큰까지 붙이는데, 이 함수를 부르는 것은 `generateMetadata`(서버
 * 컴포넌트)이고 실제 소비자는 카카오톡·슬랙의 크롤러다 — 토큰이 없고, 실패는 오류가 아니라
 * "기본 메타로 떨어진다"는 하나의 결과다. 그래서 `fetch`를 직접 쓰며 자격 증명도 붙이지 않고,
 * 응답 캐시(`next.revalidate`)를 쓰기 위해서도 이 층이 필요하다.
 *
 * 서버 경로도 응답도 응답자용 공개 폼 조회(`GET /v1/forms/{formId}/public`)와 갈린다. 이쪽은
 * `/public/v1` 아래의 **익명** 경로이고 실리는 것은 제목과 안내 문구뿐이다 — 접수 기간·접수
 * 상태·문항은 오지 않는다. 메신저가 OG를 한 번 캐싱하면 갱신하지 않아 카드가 굳으므로
 * 시간에 따라 변하는 값을 애초에 내려주지 않는 것이 서버 계약이다(ssccops#194 제약 ②).
 */

/** `{ success, code, message, data }` 봉투 — `apiFetch`를 거치지 않으므로 여기서 직접 벗긴다 */
interface MetaEnvelope {
  data?: {
    formId?: number | null;
    formTtlNm?: string | null;
    pageDescCn?: string | null;
  } | null;
}

export interface PublicFormMeta {
  formTtlNm: string;
  /** 첫 페이지 안내 문구. 서버가 비어 있으면 `null`을 주고 대체 문구를 만들지 않는다 */
  pageDescCn: string | null;
}

/**
 * 접수를 연 적 있는 공개 폼의 제목·안내 문구. 없거나 아직 열지 않은 폼이면 `null`이다.
 *
 * **던지지 않는다.** 부르는 쪽이 카드를 만드는 자리라, 실패는 "기본 메타로 떨어진다"는 하나의
 * 결과로 수렴한다 — 서버가 죽었는지 폼이 DRAFT인지는 카드를 만드는 데 아무 차이가 없고,
 * 구별하려 들면 `generateMetadata`가 오류 처리 분기를 갖게 된다.
 *
 * 서버는 DRAFT 폼과 없는 폼을 **같은 404**로 답한다(그 번호의 폼이 있는지를 감춘다). 그래서
 * 여기서도 둘을 가르지 않는다.
 */
export async function fetchPublicFormMeta(formId: number): Promise<PublicFormMeta | null> {
  // `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/public/v1/forms/${formId}/meta`, {
      headers: { Accept: "application/json" },
      /*
       * 카드는 한 번 굳으므로 매 크롤에 최신값을 받을 이유가 없고, 제목은 자주 바뀌지 않는다.
       * 그렇다고 영구 캐시로 두면 오타를 고친 제목이 반영되지 않아 재검증 주기를 짧게 둔다.
       */
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as MetaEnvelope;
    const title = body.data?.formTtlNm?.trim();
    if (!title) return null;

    const description = body.data?.pageDescCn?.trim();
    return { formTtlNm: title, pageDescCn: description || null };
  } catch {
    /*
     * 서버에 닿지 못했거나 JSON이 아니었다. 카드가 밋밋한 것과 페이지가 안 뜨는 것은 무게가
     * 다르므로 조용히 기본 메타로 넘긴다 (행사 상세 OG와 같은 자리).
     */
    return null;
  }
}
