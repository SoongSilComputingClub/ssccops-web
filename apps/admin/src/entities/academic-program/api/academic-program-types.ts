import { apiFetch } from "@/shared/lib/api/client";
import type {
  AcademicProgramType,
  AcademicProgramTypeSaveInput,
} from "../model/types";

/*
 * 학술 활동 유형 코드테이블 API (ssccops-server #130 · #122).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼·업무·하위 업무 유형
 * 도메인이 잡아 둔 규칙 그대로다. 화면이 응답 객체를 그대로 들고 다니면 계약이 바뀔 때마다
 * 뷰 전체를 훑어야 한다.
 *
 * enum 이 아니라 코드테이블인 것은 세미나·특강·대회 등 새 유형이 배포 없이 시드 추가만으로
 * 열려야 하기 때문이다(서버 data.sql · 학술관리_기능범위.md §2). STUDY·PROJECT 두 개가
 * 시드돼 있다.
 *
 * 인가는 핸들러마다 갈린다 (서버 #9): 조회는 인증만, 등록·수정·사용 전환은
 * `ACADEMIC_PROGRAM_MANAGE` 다. 그래서 **목록은 보이는데 저장만 403** 인 상태가 정상적으로
 * 존재한다 — sub_work_type 과 같은 자리다.
 *
 * 유형을 지우는 엔드포인트는 없다. 활동이 FK 로 참조하므로 하드 삭제가 불가능하고, 대신
 * 사용 여부를 내린다(form_lbl·sub_work_type 과 같은 축).
 */

/** 유형_명 최대 길이 (acdm_actv_type.type_nm 명V50) — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const TYPE_NAME_MAX_LENGTH = 50;
/** 유형_코드 최대 길이 (acdm_actv_type_cd V30) */
export const TYPE_CODE_MAX_LENGTH = 30;
/** 유형_코드 형식 — 대문자로 시작, 대문자·숫자·밑줄만. STUDY/PROJECT 시드와 같은 표기를 강제한다 */
export const TYPE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * 학술 활동 유형 API 가 돌려주는 오류 코드 (ssccops-server AcademicProgramErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** `ACADEMIC_PROGRAM_TYPE_NOT_FOUND`·
 * `ACADEMIC_PROGRAM_TYPE_CODE_DUPLICATED` 는 enum 이름과 코드 문자열이 같지만,
 * `@RequireAuthority` AOP 가 던지는 403 은 `AUTHORITY_REQUIRED` 로 온다(#9) — 화면이 보기엔
 * 같은 거절이라 `API_ERROR.FORBIDDEN`·`ACCESS_DENIED` 와 함께 다룬다.
 */
export const ACADEMIC_PROGRAM_TYPE_ERROR = {
  /** 유형_명 누락·50자 초과, 코드 형식 위반, 표시_순번 누락 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 없는 유형 코드로 조회·수정·활성 전환 (404) — 목록을 다시 불러와야 한다 */
  ACADEMIC_PROGRAM_TYPE_NOT_FOUND: "ACADEMIC_PROGRAM_TYPE_NOT_FOUND",
  /** 같은 코드의 유형이 이미 있다 (409) */
  ACADEMIC_PROGRAM_TYPE_CODE_DUPLICATED: "ACADEMIC_PROGRAM_TYPE_CODE_DUPLICATED",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface AcademicProgramTypeResponse {
  typeCd: string;
  typeNm: string | null;
  indctSeqno: number | null;
  useYn: boolean;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toAcademicProgramType(
  res: AcademicProgramTypeResponse,
): AcademicProgramType {
  return {
    typeCd: res.typeCd,
    // 빈 이름을 "-"로 채우지 않는다 — 표시용 폴백은 그리는 쪽이 정한다(#122)
    typeName: res.typeNm ?? "",
    displayOrder: res.indctSeqno ?? 0,
    useYn: res.useYn,
  };
}

/* ── 목록 ──────────────────────────────────────────────────── */

/**
 * GET /v1/academic-program-types — 유형 목록.
 *
 * 전량을 `indctSeqno` 순으로 내려주며 **비활성 유형도 포함한다**. 관리 화면은 그래야 한다 —
 * 여기서 활성만 받으면 방금 끈 유형이 목록에서 사라져 되돌릴 방법이 없어진다. 커서 페이징이
 * 없어(기준 데이터) `apiFetchList` 가 아니라 `apiFetch` 를 쓴다.
 *
 * 등록 폼의 유형 드롭다운에서 활성만 필요하면 이 응답을 `useYn` 으로 거른다 — 서버에
 * `useYn` 파라미터가 없다(sub_work_type 과 다르다).
 */
export async function fetchAcademicProgramTypes(): Promise<AcademicProgramType[]> {
  const types = await apiFetch<AcademicProgramTypeResponse[] | null>(
    "/v1/academic-program-types",
  );
  return (types ?? []).map(toAcademicProgramType);
}

/* ── 등록 · 수정 ───────────────────────────────────────────── */

function toSaveBody(input: AcademicProgramTypeSaveInput): string {
  return JSON.stringify({
    typeCd: input.typeCd.trim(),
    typeNm: input.typeName.trim(),
    indctSeqno: input.displayOrder,
  });
}

/*
 * 등록·수정 응답 본문을 쓰지 않는다. 관리 화면은 저장 직후 목록을 다시 부르는데(정렬 순서를
 * 서버가 정한다) 응답의 한 행을 배열에 끼워 넣으면 그 규칙을 웹이 흉내 내게 된다 —
 * 성공 여부만 보고 목록은 서버에서 다시 받는다(sub_work_type·form_lbl 이 밟은 경로).
 */

/** POST /v1/academic-program-types — 유형 등록. 새 유형은 항상 활성으로 만들어진다 */
export async function createAcademicProgramType(
  input: AcademicProgramTypeSaveInput,
): Promise<void> {
  await apiFetch<AcademicProgramTypeResponse | null>("/v1/academic-program-types", {
    method: "POST",
    body: toSaveBody(input),
  });
}

/**
 * PATCH /v1/academic-program-types/{typeCd} — 유형 수정.
 *
 * **부분 수정이 아니라 폼 전체 저장이다.** 코드(typeCd)는 바꿀 수 없다 — 경로의 값이 유일한
 * 식별자이고 본문의 typeCd 는 서버가 무시한다. 코드를 바꿔야 하면 새 유형을 만들고 이전
 * 유형은 사용 여부를 끈다. 사용 여부는 여기서 바뀌지 않는다(아래 activation 이 따로 바꾼다).
 */
export async function updateAcademicProgramType(
  typeCd: string,
  input: AcademicProgramTypeSaveInput,
): Promise<void> {
  await apiFetch<AcademicProgramTypeResponse | null>(
    `/v1/academic-program-types/${encodeURIComponent(typeCd)}`,
    { method: "PATCH", body: toSaveBody(input) },
  );
}

/* ── 사용 여부 전환 ────────────────────────────────────────── */

/**
 * PATCH /v1/academic-program-types/{typeCd}/activation — 목록의 '사용' 토글.
 *
 * 저장 폼과 엔드포인트가 나뉜 것은 토글만 누르는 흐름이 폼 값 전체를 들고 있지 않기 때문이다
 * (sub_work_type 과 같은 이유). 비활성 유형은 새 활동이 고를 수 없을 뿐, 이미 그 유형으로
 * 등록된 활동은 그대로 남는다.
 */
export async function setAcademicProgramTypeUse(
  typeCd: string,
  useYn: boolean,
): Promise<void> {
  await apiFetch<AcademicProgramTypeResponse | null>(
    `/v1/academic-program-types/${encodeURIComponent(typeCd)}/activation`,
    { method: "PATCH", body: JSON.stringify({ useYn }) },
  );
}
