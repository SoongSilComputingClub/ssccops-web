import type { QitemCpstCn } from "@ssccops/form-renderer";

/*
 * 모집 폼(지원서) 도메인 타입 (#528 · ssccops-server#483).
 *
 * ── 어드민 `entities/form`과 같은 이름이지만 훨씬 작다 ────────
 * 어드민은 폼 목록·라벨·복제·삭제·접수 전이까지 다루지만, 이 앱의 리더가 만질 수 있는 것은
 * **자기 활동에 연결된 폼 한 건의 문항 구성**뿐이다. 서버도 그 경계를 본문으로 못 박았다 —
 * `PUT .../recruitment/form`은 문항 구성 하나만 받고 제목·접수 기간·라벨·다중 응답은 받지
 * 않는다(받지 않으므로 덮어쓸 수 없다 · 서버 #483 «모집 일정은 학술국장이 정한다»의 두 번째
 * 방어선). 그래서 여기에는 그 값들을 **고칠 수단이 없고 읽기용으로만 담는다.**
 *
 * 문항 구성 안의 타입(`FormPage`·`Qitem`·`QitemCpstCn`)은 여기서 정의하지 않는다 —
 * `@ssccops/form-renderer`가 정본이고 어드민도 그것을 쓴다(#152). 두 벌을 두면 한쪽에만
 * 필드가 늘었을 때 타입도 린트도 잡지 못한다.
 */

/**
 * 접수 상태 — 서버 `FormReceiptStatus`가 기간까지 보고 파생한 값이다(`FormReceiptPolicy`).
 *
 * **활동 상태(`AcdmActvSttsCd`)와 다른 축이다.** 학술국장이 미래 시작일로 모집을 시작하면
 * 활동은 곧바로 `ONGOING`이지만 접수는 아직 열리지 않았다(`SCHEDULED`) — 화면의 «모집 시작
 * 전»은 그 구간까지 포함한다(서버 `AcademicProgramSummaryResponse` 주석).
 */
export type FormReceiptStatus = "DRAFT" | "SCHEDULED" | "ACCEPTING" | "EXPIRED" | "CLOSED";

/**
 * 모집 폼 한 건 — `GET·PUT /v1/academic-programs/{id}/recruitment/form`의 `form`.
 *
 * 서버가 폼 상세(`FormDetailResponse`)를 **통째로** 싣는다(어드민 `GET /v1/forms/{formId}`와
 * 같은 몸통). 여기에는 화면이 실제로 쓰는 것만 옮겨 적는다 — 라벨·응답 집계·생성자처럼
 * 이 앱에 화면이 없는 값은 받아도 그릴 자리가 없다.
 */
export interface RecruitmentForm {
  formId: number;
  formTtlNm: string;
  /** 접수 상태 — 카드·헤더 배지가 이 값으로 갈린다 */
  receiptStatus: FormReceiptStatus;
  /** 접수 시작 일시 — **읽기 전용.** 학술국장이 모집 관리에서 정한다 */
  rcptBgngDt: string | null;
  /** 접수 종료 일시 — 읽기 전용 */
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn;
  /**
   * 문항 버전 — 구성이 실제로 바뀐 저장에서만 1 오른다(서버 `FormEntity.update`의 반환값이
   * 판정한다). 화면은 «문항 버전 v3»으로 보여 주고, 저장 뒤 이 값이 그대로면 «바뀐 것이
   * 없다»는 뜻이다.
   */
  qitemVer: number;
  /**
   * 시스템이 요구해 지울 수 없는 문항 ID들 — 서버가 선언한 계약 그대로다(ssccops-server#155).
   *
   * 모집 폼은 시스템 폼이 아니라 보통 빈 배열이지만, 화면이 그 사실을 전제하지 않는다 —
   * 서버가 계약을 선언하면 편집기가 **첫 로드부터** 잠근다. 저장 실패로 역추론하면 같은
   * 사실이 두 벌이 되고, 잠금이 사후에만 걸린다(#155가 없애려던 상황).
   */
  systemRequiredQitemIds: string[];
  /** 제출 이상(작성 중 제외)의 응답 수 — 접수 전이면 0이다 */
  responseCount: number;
}

/**
 * 모집 폼 조회·저장 응답 — 폼 + 지금 고칠 수 있는가.
 *
 * **`isEditable`을 화면이 다시 계산하지 않는다.** 접수 상태나 시작 일시를 보고 되짚으면
 * 시계가 두 벌이 되어 «버튼은 켜져 있는데 저장은 409»인 구간이 생긴다(서버
 * `RecruitmentFormResponse` 주석 · #128 `isEditable`과 같은 자리).
 *
 * 서버는 창이 닫혀 있어도 **200에 `isEditable: false`**로 내린다 — 접수 중·종료에도 리더가
 * 자기 공고를 볼 수 있어야 한다(화면의 «지원서 문항 보기»).
 */
export interface RecruitmentFormView {
  form: RecruitmentForm;
  isEditable: boolean;
}
