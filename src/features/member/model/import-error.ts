import { MEMBER_IMPORT_ERROR } from "@/entities/member";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * CSV 이관 실패 → 화면에 띄울 한 줄 (#57 · 서버 #84·#85).
 *
 * 회원 조회·저장용 문구(`member-error.ts`)를 그대로 쓰지 않는 것은 이 경로에만 있는 코드가 넷이고
 * ("CSV로 읽을 수 없다"·"데이터가 없다"·"매핑이 틀렸다"·"검증한 파일과 다르다"), 그 넷이 전부
 * **운영자가 그 자리에서 고칠 수 있는 것**이기 때문이다 — 무엇을 고쳐야 하는지가 문장에 없으면
 * 파일을 다시 올려 보는 것 말고는 할 수 있는 일이 없다.
 */

/** 어느 단계에서든 같은 뜻인 코드들 — 두 문구 함수가 공유한다 */
function commonImportMessage(error: ApiError): string | null {
  switch (error.code) {
    case MEMBER_IMPORT_ERROR.INVALID_CSV_FILE:
      return "CSV로 읽을 수 없는 파일입니다 — 엑셀에서 'CSV UTF-8(쉼표로 분리)'로 다시 저장하고, 따옴표가 짝을 이루는지 확인해주세요";
    case MEMBER_IMPORT_ERROR.EMPTY_CSV_FILE:
      return "데이터 행이 없는 파일입니다 — 첫 줄은 헤더로 읽으므로 그 아래에 회원이 있어야 합니다";
    /*
     * 화면이 필수 매핑과 중복 매핑을 먼저 걸러 이 코드는 대개 오지 않는다. 그래도 오는 경우가
     * 하나 있다 — 2단계에서 매핑을 만든 뒤 파일만 바꿔 올린 경우다(그 파일에 없는 헤더를
     * 가리키게 된다). 그래서 문장이 "다시 고르라"가 아니라 "파일과 매핑이 어긋났다"이다.
     */
    case MEMBER_IMPORT_ERROR.CSV_MAPPING_INVALID:
      return "컬럼 매핑이 파일과 맞지 않습니다 — 파일을 바꿔 올렸다면 매핑을 다시 확인해주세요";
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회원을 이관할 권한이 없습니다 — 회원 관리(MEMBER_MANAGE) 권한이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    default:
      return null;
  }
}

/**
 * 미리보기·사전 검증 실패 → 그 단계에 띄울 한 줄.
 *
 * 두 단계를 한 함수로 묶는 것은 **아직 아무것도 저장되지 않았다**는 사실이 같기 때문이다 —
 * 어느 쪽이 실패하든 운영자가 할 일은 파일이나 매핑을 고쳐 다시 시도하는 것뿐이다.
 */
export function toMemberImportErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "파일을 확인하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  const common = commonImportMessage(error);
  if (common) return common;

  if (error.code === API_ERROR.NETWORK_ERROR) {
    return "서버에 연결할 수 없어 파일을 확인하지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  // 모르는 코드는 서버 문장을 그대로 옮긴다 — 뭉개면 원인을 알리려고 보낸 문장이 사라진다
  return error.message;
}

/**
 * 이관 실행 실패 → 사전 검증 화면에 띄울 한 줄.
 *
 * ── 문구가 답해야 하는 물음이 하나 더 있다: "들어갔는가?" ────────
 * 실행은 되돌릴 수 없어서, 실패 문장이 애매하면 운영자는 다시 올려 볼 수밖에 없고 그 재실행이
 * 곧 중복 등록이다. 그래서 **한 행도 들어가지 않았다는 사실을 문장에 적는다** — 서버가 요청을
 * 받기 전에 끊은 경우(권한·매핑·파일 불일치)와 네트워크가 끊긴 경우를 나누는 이유도 그것이다.
 *
 * 409 `IMPORT_FILE_MISMATCH`는 서버가 실행을 시작조차 하지 않은 경우다. 화면은 이 문장과 함께
 * 검증 결과를 버리고 사전 검증부터 다시 하게 만든다.
 */
export function toMemberImportExecuteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "이관을 실행하지 못했습니다 — 결과를 받지 못했으므로 회원 명부를 먼저 확인한 뒤 다시 시도해주세요";
  }

  if (error.code === MEMBER_IMPORT_ERROR.IMPORT_FILE_MISMATCH) {
    return "검증한 파일과 다릅니다 — 한 행도 등록되지 않았습니다. 사전 검증부터 다시 해주세요";
  }

  const common = commonImportMessage(error);
  if (common) return `${common} (한 행도 등록되지 않았습니다)`;

  /*
   * 네트워크 오류만은 "들어가지 않았다"고 말할 수 없다. 요청이 서버에 닿은 뒤 응답만 끊겼을 수
   * 있고, 그때 mbr에는 이미 행이 들어가 있다 — 여기서 "다시 시도하세요"라고 하면 그 재시도가
   * 학번 없는 행을 두 번 등록한다(reimportDuplicatesCount가 세는 바로 그 행들이다).
   */
  if (error.code === API_ERROR.NETWORK_ERROR) {
    return "서버 응답을 받지 못했습니다 — 이관이 진행됐을 수 있으니 다시 실행하지 말고 회원 명부에서 결과를 먼저 확인해주세요";
  }
  return error.message;
}
