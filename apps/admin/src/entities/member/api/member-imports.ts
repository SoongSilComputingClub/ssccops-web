import { apiUpload } from "@/shared/lib/api/client";

/*
 * CSV 회원 이관 API (ssccops-server #84 사전 검증 · #85 실행 · 상위 ssccops#75 · 웹 #57).
 *
 * ── 세 엔드포인트가 곧 위저드의 세 단계다 ───────────────────────
 * preview → validation → (실행). **앞의 둘은 mbr을 건드리지 않고 마지막 하나만 쓴다.**
 * 셋 다 `@RequireAuthority(MEMBER_MANAGE)`이며 미리보기도 예외가 아니다 — 남의 명부 파일을
 * 올려 헤더와 앞 5행을 받아 보는 것 자체가 개인정보 열람이라는 것이 서버의 판단이다.
 *
 * ── 헤더 파싱을 웹에서 하지 않는다 ──────────────────────────────
 * 화면은 파일을 열어 보지 않는다. 컬럼 이름도, 추천 매핑도, 미리보기 행도 전부 preview 응답에서
 * 온다. CSV 파서가 두 벌이 되면 따옴표로 감싼 필드("회장,프로젝트장")에서 해석이 갈려, 화면에서
 * 매핑한 컬럼과 서버가 실제로 읽는 컬럼이 어긋난다 — 그리고 그 어긋남은 이관이 끝난 뒤
 * 명부를 열어 봐야 드러난다. 미리보기 엔드포인트가 서버에 있는 이유가 그것이다.
 *
 * ── 요청은 JSON이 아니라 multipart/form-data다 ───────────────────
 * 파일과 함께 가야 해서 본문 전체를 JSON으로 둘 수 없다. `mapping`은 파트가 아니라 **폼 필드에
 * 담은 JSON 문자열**이고(서버가 `@RequestParam`으로 받는다), 실행에는 `fileToken`이 하나 더
 * 붙는다. 전송은 `apiUpload`가 맡는다 — Content-Type을 손으로 넣지 않는 이유는 그쪽 주석에 있다.
 */

/* ── 매핑 대상 필드 ────────────────────────────────────────── */

/**
 * 매핑할 수 있는 대상 필드의 key (서버 `MemberImportField`).
 *
 * 데이터사전의 mbr 컬럼명을 카멜케이스로 옮긴 문자열이며 mapping JSON의 **값**으로 나간다.
 * 목록 밖의 값을 보내면 서버가 조용히 무시하지 않고 400 `CSV_MAPPING_INVALID`로 끊는다.
 *
 * **졸업연도·역할은 여기 없다** (BR-M42 · BR-M44). `mbr`에 대응 컬럼이 없어 매핑해도 담을 곳이
 * 없다. 선택 상자에 자리를 만들어 두면 운영자가 매핑한 뒤 그 값이 사라졌다는 것을 이관이 끝난
 * 뒤에야 알게 된다.
 */
export type MemberImportFieldKey =
  | "mbrNm"
  | "stdntNo"
  | "genNo"
  | "scsbjtNm"
  | "scyrNo"
  | "telno"
  | "eml"
  | "joinYmd"
  | "mbrGrdCd"
  | "mbrSttsCd";

/** 매핑 선택 상자의 항목 하나 */
export interface MemberImportFieldOption {
  key: MemberImportFieldKey;
  /** 사람이 읽는 이름 — 서버 `MemberImportField.label()`과 같은 낱말을 쓴다 */
  label: string;
  /**
   * 매핑하지 않으면 400 `CSV_MAPPING_INVALID`로 요청 전체가 거절되는 필드인가.
   *
   * 값이 필수인지와는 다른 물음이다 — 학번은 재학 회원에게 값이 필수지만(행별 오류) 매핑
   * 자체는 선택이다. 여기 true인 셋은 `mbr`에서 NOT NULL이고 서버가 대신 정할 근거가 없다.
   */
  mappingRequired: boolean;
}

/**
 * 매핑 대상 필드 전량 (서버 enum 선언 순서 그대로).
 *
 * 화면이 순서를 다시 정하지 않는 것은 이 순서가 명부에서 컬럼이 놓이는 순서와 대체로 같아서다.
 * "매핑 안 함"은 목록에 넣지 않는다 — 빈 문자열은 필드가 아니라 **필드를 고르지 않았다는
 * 상태**이고, 선택 상자는 그것을 첫 항목으로 따로 그린다.
 */
export const MEMBER_IMPORT_FIELDS: readonly MemberImportFieldOption[] = [
  { key: "mbrNm", label: "회원명", mappingRequired: true },
  { key: "stdntNo", label: "학번", mappingRequired: false },
  { key: "genNo", label: "기수", mappingRequired: false },
  { key: "scsbjtNm", label: "학과", mappingRequired: false },
  { key: "scyrNo", label: "학년", mappingRequired: false },
  { key: "telno", label: "연락처", mappingRequired: false },
  { key: "eml", label: "이메일", mappingRequired: false },
  { key: "joinYmd", label: "가입일", mappingRequired: false },
  { key: "mbrGrdCd", label: "회원등급", mappingRequired: true },
  { key: "mbrSttsCd", label: "회원상태", mappingRequired: true },
] as const;

/**
 * field key → 사람이 읽는 이름. 모르는 key는 받은 문자열을 그대로 돌려준다.
 *
 * 행별 사유의 `field`가 이 key로 오는데(서버 `MemberImportRowResult.field`), 서버가 필드를 하나
 * 늘렸을 때 화면이 빈칸을 그리는 것보다 낯선 key라도 보여 주는 편이 낫다 — 운영자는 적어도
 * 무엇을 물어봐야 하는지 알게 된다.
 */
export function memberImportFieldLabel(field: string | null): string {
  if (!field) return "";
  return MEMBER_IMPORT_FIELDS.find((f) => f.key === field)?.label ?? field;
}

/**
 * 헤더 → 대상 필드 key의 매핑. 값이 빈 문자열이면 '매핑하지 않음'이다.
 *
 * key가 컬럼 위치가 아니라 **헤더 문자열**인 것은 서버 요청 형식이 그렇기 때문이다
 * (`{"이름":"mbrNm"}`). 같은 헤더가 두 번 나오는 파일에서는 서버가 첫 번째 컬럼을 쓴다.
 */
export type MemberImportMapping = Record<string, string>;

/* ── 파일 사전 검사 (클라이언트) ───────────────────────────── */

/** 서버 `MemberImportServiceImpl.MAX_FILE_SIZE_BYTES`와 같은 값 — 5MB */
export const MEMBER_IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * 고른 파일이 올릴 만한 것인지 — 문제가 있으면 화면에 띄울 한 줄, 없으면 빈 문자열.
 *
 * **크기와 확장자만 본다.** 내용 판정(헤더가 있는가·따옴표가 닫혔는가·인코딩이 UTF-8인가)은
 * 전부 서버의 몫이다 — 여기서 흉내 내면 파일을 읽는 규칙이 두 벌이 되고, 그것이 곧 이 화면이
 * 피하려는 바로 그 문제다(파일 첫 주석). 두 가지만 걸러 두는 것은 5MB짜리 zip을 올리고 응답을
 * 기다리게 하지 않으려는 것뿐이다.
 *
 * MIME 타입은 보지 않는다. 브라우저·OS에 따라 text/csv·application/vnd.ms-excel·
 * application/octet-stream으로 제각각이라 멀쩡한 CSV가 걸린다(서버가 같은 판단을 했다).
 */
export function checkMemberImportFile(file: File): string {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "CSV 파일만 올릴 수 있습니다 — 엑셀에서 'CSV UTF-8(쉼표로 분리)'로 저장해주세요";
  }
  if (file.size > MEMBER_IMPORT_MAX_FILE_SIZE) {
    return "파일이 5MB를 넘습니다 — 명부를 나눠 여러 번 이관해주세요";
  }
  if (file.size === 0) {
    return "빈 파일입니다";
  }
  return "";
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 이관 API가 돌려주는 오류 코드 (서버 `MemberErrorCode`).
 *
 * enum 이름이 아니라 **본문에 실리는 코드 문자열**이다 — 이 네 건은 둘이 같지만, 회원 API의
 * `MEMBER_NOT_FOUND`가 `"NOT_FOUND"`로 오는 것처럼 갈리는 자리가 있어 근거를 남긴다
 * (api/members.ts의 `MEMBER_ERROR` 주석).
 */
export const MEMBER_IMPORT_ERROR = {
  /** 400 — CSV로 읽을 수 없는 파일 (크기·확장자·인코딩·따옴표 불일치) */
  INVALID_CSV_FILE: "INVALID_CSV_FILE",
  /** 400 — 필수 필드 누락 · 파일에 없는 헤더 · 한 필드에 두 컬럼 */
  CSV_MAPPING_INVALID: "CSV_MAPPING_INVALID",
  /** 400 — 파일은 멀쩡하지만 데이터 행이 0건 */
  EMPTY_CSV_FILE: "EMPTY_CSV_FILE",
  /**
   * 409 — 검증한 파일과 실행에 올린 파일이 다르다.
   *
   * 이 경우 **한 행도 등록되지 않는다.** 화면은 검증 결과를 버리고 사전 검증부터 다시 하게
   * 만든다 — 확인한 내용과 들어가는 내용이 갈리면 사전 검증 단계 자체가 의미를 잃는다.
   */
  IMPORT_FILE_MISMATCH: "IMPORT_FILE_MISMATCH",
} as const;

/* ── 1단계 · 미리보기 ──────────────────────────────────────── */

/**
 * POST /v1/members/imports/preview 응답 (`MemberImportPreviewResponse`).
 *
 * - `headers` 순서가 곧 컬럼 위치다
 * - `recommendedMapping`은 헤더 이름으로 **짐작한** 값이다. 짐작하지 못한 헤더는 ""로 오며,
 *   모든 헤더가 항목을 갖고 있어 화면이 선택 상자를 그대로 그릴 수 있다. 짐작이므로 운영자가
 *   확인·수정해야 하고, 검증에 쓰이는 것은 확인된 매핑뿐이다
 * - `sampleRows`는 앞 5행이며 `headers`와 같은 길이로 맞춰져 온다 — 표의 칸이 밀리지 않는다
 * - `totalRowCount`는 헤더를 뺀 데이터 행 수다
 */
export interface MemberImportPreview {
  headers: string[];
  recommendedMapping: MemberImportMapping;
  sampleRows: string[][];
  totalRowCount: number;
}

/**
 * POST /v1/members/imports/preview — 헤더·추천 매핑·앞 5행. **아무것도 저장하지 않는다.**
 *
 * 오류는 400 `INVALID_CSV_FILE`(CSV로 성립하지 않음) · 400 `EMPTY_CSV_FILE`(데이터 0건) · 403이다.
 */
export async function previewMemberImport(file: File): Promise<MemberImportPreview> {
  const form = new FormData();
  form.append("file", file);

  const raw = await apiUpload<MemberImportPreview>("/v1/members/imports/preview", form);
  return {
    headers: raw.headers ?? [],
    recommendedMapping: raw.recommendedMapping ?? {},
    sampleRows: raw.sampleRows ?? [],
    totalRowCount: raw.totalRowCount ?? 0,
  };
}

/* ── 2단계 · 사전 검증 ─────────────────────────────────────── */

/** 행별 판정 (서버 `MemberImportRowStatus`) — 셋은 서로 겹치지 않는다 */
export type MemberImportRowStatus = "OK" | "ERROR" | "DUPLICATE";

/**
 * 행에 붙는 사유 한 건 (`MemberImportRowIssue`).
 *
 * `field`는 {@link MemberImportFieldKey}이며, 행 전체에 걸리는 사유는 null이다.
 */
export interface MemberImportRowIssue {
  field: string | null;
  message: string;
}

/**
 * 행별 검증 결과 (`MemberImportRowResult`).
 *
 * ── `rowNo`는 레코드 순번이 아니라 **원본 CSV의 물리적 줄 번호**다 ──
 * 헤더를 1행으로 세므로 첫 데이터 행은 2다. 줄바꿈을 포함한 필드가 있는 파일에서는 두 값이
 * 갈린다(레코드 3번이 7행일 수 있다). 운영자가 파일을 열어 찾는 것은 줄 번호이므로 서버가
 * 줄 번호를 주고, 화면도 그 사실을 밝혀 적는다.
 *
 * ── `warnings`는 `reasons`와 다른 것이다 ──────────────────────────
 * 경고는 **이관을 막지 않는다.** 지금은 연락처 누락 하나이며(ssccops#78 A안 — 계정 연결이
 * 학번+회원명+전화번호 3종 일치라 연락처가 빈 회원은 나중에 스스로 계정을 연결할 수 없다),
 * 경고만 있는 행의 status는 OK이고 okCount에 들어간다. 한 목록에 섞어 그리면 "고쳐야 진행되는
 * 것"과 "고치면 좋은 것"이 구별되지 않는다.
 */
export interface MemberImportRowResult {
  rowNo: number;
  /** 목록에서 사람을 알아보기 위한 표시("오세현 202112044"). 이름이 없으면 "(회원명 없음)" */
  target: string;
  status: MemberImportRowStatus;
  /** 이관을 막는 사유. status가 OK면 비어 있다 */
  reasons: MemberImportRowIssue[];
  /** 이관을 막지 않는 지적 */
  warnings: MemberImportRowIssue[];
}

/**
 * 검증 요약 (`MemberImportSummary`).
 *
 * `okCount`·`errorCount`·`duplicateCount`는 서로 겹치지 않으며 합이 `totalCount`다.
 * **`warningCount`만 그 관계 밖이다** — 경고가 있는 행도 status는 OK라 okCount에 이미 들어
 * 있다. "119건 중 7건은 연락처가 없다"를 보이기 위한 값이지 네 번째 버킷이 아니므로, 화면도
 * 다른 세 통계와 나란히 그리지 않는다.
 */
export interface MemberImportValidationSummary {
  totalCount: number;
  okCount: number;
  errorCount: number;
  duplicateCount: number;
  warningCount: number;
}

/**
 * POST /v1/members/imports/validation 응답 (`MemberImportValidationResponse`).
 *
 * `fileToken`은 파일 내용의 SHA-256이다. 실행에 이 값을 되돌려 주게 해서 화면에서 확인한 파일과
 * 실제로 넣는 파일이 같음을 서버가 확인한다 — 이름이 아니라 내용의 해시인 것은 같은 이름의 다른
 * 파일이 흔하기 때문이다.
 *
 * `rows`에는 **모든 행**이 온다(OK도 포함). 오류 행만 내려오면 화면이 "13행은 통과한 것인가
 * 결과에서 빠진 것인가"를 답할 수 없다.
 */
export interface MemberImportValidation {
  fileToken: string;
  summary: MemberImportValidationSummary;
  rows: MemberImportRowResult[];
}

const EMPTY_VALIDATION_SUMMARY: MemberImportValidationSummary = {
  totalCount: 0,
  okCount: 0,
  errorCount: 0,
  duplicateCount: 0,
  warningCount: 0,
};

/** 서버가 목록을 빠뜨렸어도 화면이 `.map`에서 터지지 않게 배열로 굳힌다 */
function toRowResult(raw: MemberImportRowResult): MemberImportRowResult {
  return {
    rowNo: raw.rowNo,
    target: raw.target,
    status: raw.status,
    reasons: raw.reasons ?? [],
    warnings: raw.warnings ?? [],
  };
}

/**
 * POST /v1/members/imports/validation — 매핑을 적용해 **전량**을 검증한다.
 *
 * **아무것도 저장하지 않는다.** 실제 등록은 {@link executeMemberImport}의 몫이다.
 *
 * 매핑은 헤더별 항목을 **모두** 실어 보낸다(고르지 않은 것은 ""). 빈 값을 빼고 보내도 서버
 * 판정은 같지만, 보낸 매핑과 화면에 보이는 매핑이 같은 편이 나중에 요청을 들여다볼 때 낫다.
 *
 * 오류는 400 `CSV_MAPPING_INVALID`(필수 필드 누락·없는 헤더·한 필드에 두 컬럼) ·
 * 400 `INVALID_CSV_FILE` · 400 `EMPTY_CSV_FILE` · 403이다.
 */
export async function validateMemberImport(
  file: File,
  mapping: MemberImportMapping,
): Promise<MemberImportValidation> {
  const form = new FormData();
  form.append("file", file);
  form.append("mapping", JSON.stringify(mapping));

  const raw = await apiUpload<MemberImportValidation>(
    "/v1/members/imports/validation",
    form,
  );
  return {
    fileToken: raw.fileToken,
    summary: raw.summary ?? EMPTY_VALIDATION_SUMMARY,
    rows: (raw.rows ?? []).map(toRowResult),
  };
}

/* ── 3단계 · 실행 ──────────────────────────────────────────── */

/** 실행의 행별 결과 (서버 `MemberImportExecutionStatus`) */
export type MemberImportExecutionStatus = "CREATED" | "SKIPPED" | "FAILED";

/**
 * 실행 결과 한 줄 (`MemberImportExecutionRow`).
 *
 * `rowNo`는 검증과 같은 값이다 — 두 화면의 줄 번호가 같아야 운영자가 검증에서 본 줄과 결과의
 * 줄을 맞출 수 있다. `mbrId`는 CREATED일 때만, `reason`은 SKIPPED·FAILED일 때만 채워진다.
 */
export interface MemberImportExecutionRow {
  rowNo: number;
  target: string;
  status: MemberImportExecutionStatus;
  /** 방금 만들어진 회원 번호 — 화면이 그 회원으로 바로 갈 수 있게 하는 값이다 */
  mbrId: number | null;
  reason: string | null;
}

/**
 * 실행 요약 (`MemberImportExecutionSummary`).
 *
 * `createdCount`·`skippedCount`·`failedCount`는 겹치지 않으며 합이 `totalCount`다.
 *
 * ── `reimportDuplicatesCount`는 그 관계 밖이다 ────────────────────
 * **이 API는 멱등하지 않다.** 같은 파일을 다시 실행하면 학번이 있는 행은 전부 SKIPPED가 되지만
 * (mbr에 이미 그 학번이 있으므로), **학번이 없는 졸업 회원 행은 중복이라고 판정할 근거가 아예
 * 없어 두 번 들어간다.** 이 값은 이번 실행에서 학번 없이 새로 들어간 행의 수, 곧 재실행하면
 * 그대로 중복 등록될 행의 수다. `createdCount`에 이미 포함돼 있다.
 *
 * 결과 화면이 이 값을 반드시 드러내야 하는 것은, 이관이 실패한 줄 알고 다시 올리는 일이
 * 흔하기 때문이다 — 그때 무엇이 두 번 들어가는지는 이 숫자에만 남아 있다.
 */
export interface MemberImportExecutionSummary {
  totalCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  reimportDuplicatesCount: number;
}

/** POST /v1/members/imports 응답 (`MemberImportExecutionResponse`) — rows에는 모든 행이 온다 */
export interface MemberImportExecution {
  summary: MemberImportExecutionSummary;
  rows: MemberImportExecutionRow[];
}

const EMPTY_EXECUTION_SUMMARY: MemberImportExecutionSummary = {
  totalCount: 0,
  createdCount: 0,
  skippedCount: 0,
  failedCount: 0,
  reimportDuplicatesCount: 0,
};

/**
 * POST /v1/members/imports — **mbr에 행이 생기는 자리다. 되돌릴 수 없다.**
 *
 * 서버가 검증을 다시 수행한 뒤 통과한 행만 등록한다. **행 단위로 처리하므로 한 행의 실패가
 * 다른 행을 되돌리지 않는다** — 오류 행은 FAILED, 학번이 이미 있는 행은 SKIPPED(덮어쓰지
 * 않는다 · BR-M40), 나머지는 CREATED다. 등급·상태는 CSV 값 그대로 들어가고 auth_user_id는
 * 비어 있다.
 *
 * `fileToken`은 검증 응답이 준 값을 그대로 되돌려 보낸다. 다르면 409 `IMPORT_FILE_MISMATCH`이며
 * **한 행도 등록되지 않는다** — 화면은 검증부터 다시 하게 만든다.
 *
 * 응답이 201이 아니라 200인 것은 만들어진 자원 하나를 가리키는 답이 아니기 때문이다. 한 건도
 * 들어가지 않고 전부 실패로 끝나는 것도 정상 응답이므로, 화면은 성공/실패가 아니라 **요약을**
 * 그린다.
 */
export async function executeMemberImport(
  file: File,
  mapping: MemberImportMapping,
  fileToken: string,
): Promise<MemberImportExecution> {
  const form = new FormData();
  form.append("file", file);
  form.append("mapping", JSON.stringify(mapping));
  form.append("fileToken", fileToken);

  const raw = await apiUpload<MemberImportExecution>("/v1/members/imports", form);
  return {
    summary: raw.summary ?? EMPTY_EXECUTION_SUMMARY,
    rows: raw.rows ?? [],
  };
}
