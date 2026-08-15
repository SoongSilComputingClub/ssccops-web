import type { AprvSttsCd, PrrtyRnkCd, WorkSttsCd } from "@/shared/config/codes";
import { ApiError, apiFetch } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";

/*
 * 하위 업무 API (ssccops-server OPS-007 등록 · #36).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼·업무 도메인이 잡아 둔 규칙
 * 그대로다. 화면이 응답 객체를 그대로 들고 다니면 계약이 바뀔 때마다 뷰 전체를 훑어야 한다.
 *
 * 인가는 상위 업무와 같은 `WORK_MANAGE`다 (서버 #9 · SubWorkController 클래스 애노테이션) —
 * 상위 업무와 하위 업무를 나눠 부여할 이유가 없다는 판단이고, 그래서 화면도 업무 등록과 같은
 * capability로 잠근다.
 *
 * 목록(OPS-008)·상세(OPS-009)·전이(OPS-010)는 아직 여기 없다. 그 화면들은 목 스토어를 쓰며
 * 이 이슈의 범위는 등록 하나다 — 붙이는 순간 같은 파일에 이어 쓴다.
 */

/** 외부_URL_주소 최대 길이 (sub_work.otsd_url_addr 주소V200) — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const EXTERNAL_LINK_MAX_LENGTH = 200;

/**
 * 하위 업무 API가 돌려주는 오류 코드 (ssccops-server OperationErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** 서버의 `WORK_NOT_FOUND`·
 * `SUB_WORK_TYPE_NOT_FOUND`는 둘 다 `"NOT_FOUND"`를, `OWNER_NOT_ACTIVE_MEMBER`·
 * `INVALID_OPERATION_PERIOD`·`SUB_WORK_TYPE_INACTIVE`는 셋 다 `"VALIDATION_FAILED"`를
 * 내린다 — enum 이름을 적어 두면 어느 화면도 못 알아본다.
 *
 * 그래서 **한 코드에 여러 사유가 겹친다.** 어느 칸을 고쳐야 하는지는 서버 메시지에만 남아
 * 있으므로 이 두 코드는 문구를 뭉개지 말고 서버 문장을 그대로 보여 준다.
 */
export const SUB_WORK_ERROR = {
  /** 담당자 부적격·기간 역전·꺼진 유형·필수값 누락 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — 우선_순위가 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** 없는(삭제된) 상위 업무 · 없는 하위 업무 유형 (404) */
  NOT_FOUND: "NOT_FOUND",
  /** WORK_MANAGE 권한 없음 (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

/*
 * 등록 응답에서 **화면이 실제로 쓰는 필드만** 옮긴다.
 *
 * 서버는 담당자·기간·우선순위·체크리스트 항목까지 한 벌을 다 내려주지만, 등록을 마친 화면은
 * 상위 업무 상세로 이동해 그쪽 조회 응답을 다시 받는다 — 여기서 전부 받아 적으면 쓰지도 않는
 * 필드가 계약이 바뀔 때마다 고쳐야 할 자리로만 남는다.
 */
interface SubWorkCreateResponse {
  subWorkId: number | null;
  workId: number | null;
  title: string | null;
  subWorkTypeId: number | null;
  subWorkTypeName: string | null;
  workStatus: WorkSttsCd | null;
  approvalStatus: AprvSttsCd | null;
  /** 유형의 완료 점검 항목을 복사해 서버가 함께 만든다 (등록과 동시에 생긴다) */
  checklist: unknown[] | null;
}

/* ── 등록 ──────────────────────────────────────────────────── */

/**
 * 하위 업무 등록 입력 (OPS-007).
 *
 * 화면에 있는 값 중 여기 없는 것들이 있다 — 업무_상태·승인_상태·지연_여부·완료 체크리스트는
 * **서버가 정한다.** 상태는 항상 기획(PLANNING)이고, 승인_상태는 고른 유형의 승인 필요 여부에서
 * 결정되며, 체크리스트는 그 유형의 완료 점검 항목을 복사해 등록과 동시에 만들어진다.
 * 등록자도 인증 주체에서 온다.
 *
 * `ownerId`는 활동 회원이어야 한다 — 없거나 활동 회원이 아니면 400 VALIDATION_FAILED
 * (OWNER_NOT_ACTIVE_MEMBER)다. `subWorkTypeId`는 **사용 중인 유형**이어야 한다(꺼진 유형은
 * 400 SUB_WORK_TYPE_INACTIVE) — 화면이 유형 목록을 `useYn=true`로 받는 이유다.
 */
export interface SubWorkCreateInput {
  /** 상위 업무 — 하위 업무는 상위 업무 안에서만 생긴다 */
  workId: number;
  title: string;
  subWorkTypeId: number;
  ownerId: number;
  startAt: string | null;
  /** oper의 종료_일시. 화면의 '마감_일시' 한 칸이 dueAt과 함께 이 값도 채운다 */
  endAt: string | null;
  /** sub_work의 마감_일시 — 지연 판정·마감 임박 조회가 이 값에 걸려 있다 */
  dueAt: string | null;
  /** 생략하면 서버가 NORMAL로 저장한다 */
  priority: PrrtyRnkCd;
  /** 업무_내용 — 선택 입력 */
  content: string | null;
  /** 외부_URL_주소 — 선택 입력. URL 형식이어야 하고 200자를 넘을 수 없다 */
  externalLink: string | null;
}

/** 등록 결과 — 화면은 곧바로 상위 업무 상세로 돌아가 이 하위 업무가 붙은 것을 확인한다 */
export interface SubWorkCreateResult {
  subWorkId: number;
  workId: number | null;
  title: string;
  subWorkTypeName: string;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd | null;
  /** 서버가 유형에서 복사해 만든 완료 점검 항목 수 */
  checklistCount: number;
}

/**
 * POST /v1/sub-works — 하위 업무 등록 (OPS-007).
 *
 * 일시에는 **오프셋을 반드시 붙인다.** `datetime-local` 입력은 `"2026-09-12T10:00"`처럼
 * 오프셋 없는 값을 주는데 서버의 `startAt`·`endAt`·`dueAt`은 `OffsetDateTime`이라 본문 파싱
 * 단계에서 400으로 튕긴다 (업무 등록·폼 저장이 같은 자리에서 겪었다 · withServiceOffset 주석).
 *
 * `subWorkId` 없이 성공으로 처리하지 않는다 — 등록의 목적이 그 하위 업무가 상위 업무에 붙는
 * 것이라, ID를 모른 채 "등록했습니다"만 띄우면 정말 만들어졌는지 확인할 길이 없다.
 */
export async function createSubWork(
  input: SubWorkCreateInput,
): Promise<SubWorkCreateResult> {
  const res = await apiFetch<SubWorkCreateResponse | null>("/v1/sub-works", {
    method: "POST",
    body: JSON.stringify({
      workId: input.workId,
      title: input.title.trim(),
      subWorkTypeId: input.subWorkTypeId,
      ownerId: input.ownerId,
      startAt: withServiceOffset(input.startAt),
      endAt: withServiceOffset(input.endAt),
      dueAt: withServiceOffset(input.dueAt),
      priority: input.priority,
      content: input.content?.trim() || null,
      externalLink: input.externalLink?.trim() || null,
    }),
  });

  if (!res?.subWorkId) {
    throw new ApiError(
      SUB_WORK_ERROR.VALIDATION_FAILED,
      "하위 업무는 등록됐지만 서버가 하위_업무_ID를 돌려주지 않았습니다. 상위 업무 상세에서 확인해주세요",
    );
  }

  return {
    subWorkId: res.subWorkId,
    workId: res.workId ?? input.workId,
    title: res.title ?? input.title.trim(),
    subWorkTypeName: res.subWorkTypeName ?? "",
    // 서버가 기획(PLANNING)으로 고정하는 값이라 폴백도 같은 값이다
    workStatus: res.workStatus ?? "PLANNING",
    approvalStatus: res.approvalStatus ?? null,
    checklistCount: res.checklist?.length ?? 0,
  };
}
