import type { FormReceiptStatus } from "./types";

/*
 * 폼 표시 헬퍼.
 *
 * 목 스토어(`useFormStore` + `get-form.json` 시드)를 걷어내고 남은 파일이다. 목록·상세는
 * `/v1/forms`(#7·#9)에서, 응답자 화면은 `/v1/forms/{id}/public`(#12)에서 폼을 받으므로
 * 브라우저 메모리에 폼 배열을 들고 있을 이유가 사라졌다 — 마지막까지 그 배열을 읽던 공개 폼
 * 화면이 서버로 옮겨 가면서 시드를 지웠다(store.ts 주석이 예고한 대로).
 */

/**
 * 접수 상태 배지 표기 (ssccops-server #33).
 *
 * **`formSttsCd`가 아니라 `receiptStatus`로 그린다.** 접수 기간이 끝나도 서버는 상태를
 * 자동으로 CLOSED로 바꾸지 않으므로(배치 대신 표시 계층에서 구분하기로 한 결정),
 * `formSttsCd`로 배지를 고르면 이미 응답을 받지 않는 폼이 '접수중'이라고 말하게 된다.
 *
 * 그래서 `FORM_STTS_BADGE`는 지웠다 — 남겨 두면 다음 화면이 다시 그것으로 배지를 그려
 * 같은 괴리가 되살아난다. 목록 필터 칩처럼 **폼 상태 코드 자체**를 표기해야 하는 자리는
 * 기준 코드 사전의 `FORM_STTS_NM`을 쓴다.
 *
 * 'EXPIRED'만 amber인 것은 운영자가 손댈 여지가 있는 유일한 칸이기 때문이다 — 기간을
 * 늘리든 마감하든 결정이 필요하다. '접수 예정'과 '작성 중'은 아직 아무 일도 일어나지 않은
 * 상태라 강조하지 않는다.
 */
export const FORM_RECEIPT_BADGE: Record<
  FormReceiptStatus,
  { label: string; tone: "outline" | "blue" | "grey" | "amber" }
> = {
  DRAFT: { label: "작성중", tone: "outline" },
  SCHEDULED: { label: "접수 예정", tone: "outline" },
  ACCEPTING: { label: "접수중", tone: "blue" },
  EXPIRED: { label: "기간 종료", tone: "amber" },
  CLOSED: { label: "마감", tone: "grey" },
};
