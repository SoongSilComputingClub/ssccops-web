import type { BadgeTone } from "@/shared/ui";
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

/**
 * 시스템 폼 배지 (ssccops-server #140).
 *
 * **라벨과 구별되게 그린다.** 라벨은 운영진이 회차마다 붙였다 떼는 운영 데이터라 둥근 알약
 * (`Pill`)이고, 이것은 코드가 그 폼을 가리키고 있다는 표시라 접수 상태와 같은 각진 배지를 쓴다.
 * 색은 접수 상태가 쓰지 않는 유일한 톤(`outline-accent`)이라 두 배지가 나란히 놓여도 갈리지
 * 않는다 — 접수 상태는 blue·grey·amber·outline 넷을 쓴다.
 *
 * 문구는 "시스템 폼" 한 마디다. `sysFormCd`는 코드가 폼을 찾는 열쇠이지 사람이 읽는 값이
 * 아니라서 화면에 내보내지 않는다.
 */
export const SYSTEM_FORM_BADGE: { label: string; tone: BadgeTone } = {
  label: "시스템 폼",
  tone: "outline-accent",
};

/*
 * 시스템 폼 안내 문구 — **화면이 미리 막을 때와 서버가 거절했을 때가 같은 문장이어야 한다.**
 *
 * 같은 상황을 두 문장으로 말하면 사용자는 두 가지 일이 일어난 줄 안다. 그래서 잠긴 버튼의
 * 사유(`title`)와 오류 코드 매핑(features/form/model/form-error.ts)이 여기서 같은 값을 꺼내 쓴다.
 */

/**
 * 폼 삭제 잠금 — 409 `SYSTEM_FORM_IMMUTABLE`과 같은 문장.
 *
 * **지금 웹에는 폼 삭제 버튼이 없다**(서버에도 삭제 엔드포인트가 없다). 잠글 버튼이 없으니
 * 이 문장이 지금 닿는 자리는 상세 화면의 안내와 오류 매핑 둘뿐이다 — 그래도 여기 두는 것은
 * 삭제를 만드는 이슈가 문구를 새로 지어내지 않게 하기 위해서다.
 */
export const SYSTEM_FORM_DELETE_LOCKED =
  "시스템이 사용하는 폼이라 지울 수 없습니다 — 대신 접수를 마감하세요";

/** 코드가 요구하는 문항의 삭제 잠금 — 400 `SYSTEM_FORM_CONTRACT_VIOLATION`과 같은 문장 */
export const SYSTEM_FORM_QITEM_LOCKED =
  "이 문항은 시스템이 사용하고 있어 지울 수 없습니다 — 문구 수정과 문항 추가는 할 수 있습니다";

/**
 * 시스템 폼에서 무엇이 열려 있는가.
 *
 * 잠긴 것만 말하면 운영진은 폼 전체가 굳은 줄 알고 손대지 않는다. 실제로 잠기는 것은 삭제와
 * 시스템이 쓰는 문항뿐이라, 회차마다 바꾸는 값들이 그대로 열려 있다는 사실을 함께 적는다.
 */
export const SYSTEM_FORM_OPEN_PARTS =
  "제목·접수 기간·라벨·접수 상태는 그대로 바꿀 수 있습니다";

/** 복제 안내 — 사본은 코드가 가리키지 않는 일반 폼이 된다 (서버 FormEntity.create) */
export const SYSTEM_FORM_DUPLICATE_NOTE =
  "시스템 폼을 복제하면 사본은 일반 폼이 됩니다 — 시스템 표시는 승계하지 않습니다";

/** 문항 버전 안내 — 편집 화면이 저장 전에 알린다 */
export const QITEM_VERSION_NOTE = "문항을 바꾸면 버전이 올라가고 변경 내역이 남습니다";
