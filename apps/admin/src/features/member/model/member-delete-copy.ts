import type { MemberDeletionPreview } from "@/entities/member";

/*
 * 회원 하드 삭제의 플래그와 문구 (임시 · ADR-0021 · ssccops-web#411 · 서버 #361).
 *
 * ── 왜 임시인가 ─────────────────────────────────────────────────
 * 회원 삭제는 만들지 않기로 했던 기능이다 — 회원은 응답·참가·승인·이력의 주체라 행을 지우면
 * 그 기록이 함께 사라진다. 그런데 연동 실패로 **중복 계정**이 생겼다(#264 이전, 명부 회원이
 * 연결 버튼을 못 보고 새로 가입했다). 고치는 길은 새 계정을 지우고 그 사람이 다시 로그인해
 * 명부 행에 연결하는 것뿐이라, 그 정리가 끝날 때까지만 연다. 끝나면 **플래그를 끄고 코드는
 * 남긴다**(ADR-0021 폐기 조건).
 *
 * ── 플래그를 모듈 상단 상수로 읽는 이유 ─────────────────────────
 * `NEXT_PUBLIC_*`은 빌드 시점에 문자열로 인라인된다. 렌더 안에서 `process.env`를 읽어도
 * 값은 같지만, 상수로 한 번 읽어 두면 "이 값은 배포마다 다르고 런타임에 바뀌지 않는다"가
 * 코드에 남고, 구역·훅·시트가 같은 판단을 세 번 하지 않는다.
 */
export const MEMBER_HARD_DELETE_ENABLED = process.env.NEXT_PUBLIC_MEMBER_HARD_DELETE === "true";

/** 구역 제목 */
export const MEMBER_DELETE_TITLE = "회원 삭제";

/** 구역 설명 한 줄 — 무엇을 위한 것이고 되돌릴 수 없다는 사실까지 */
export const MEMBER_DELETE_DESCRIPTION =
  "연동 실패로 생긴 중복 계정을 지우는 임시 기능입니다 — 되돌릴 수 없습니다";

/** 확인 시트 제목·힌트 */
export const MEMBER_DELETE_CONFIRM_TITLE = "회원을 지웁니다";
export const MEMBER_DELETE_HINT = "되돌릴 수 없습니다 — 아래 내용을 확인한 뒤 회원명을 입력해주세요";

/**
 * 구글 계정 안내 — **복구 경로라서 빠뜨릴 수 없다.**
 *
 * 삭제는 되돌릴 수 없지만 그 사람의 구글 로그인은 지우지 않는다(지울 수단도 이유도 없다).
 * 다시 로그인하면 «가입 필요»가 되고 거기서 «기존 회원 정보와 연결하기»로 명부 행에 붙는다 —
 * 중복 계정을 정리하는 목적 자체가 이 경로다. 이 문장이 없으면 운영진은 사람을 시스템에서
 * 영영 내보낸 줄 알고, 지운 뒤 당사자에게 무엇을 안내해야 하는지도 모른다.
 */
export const MEMBER_DELETE_GOOGLE_NOTE =
  "구글 로그인은 남습니다 — 이 분이 다시 로그인하면 가입 화면이 뜨고, 거기서 기존 회원 정보와 연결할 수 있습니다";

/** 회원명이 아직 맞지 않아 확인 버튼이 잠긴 이유 */
export const MEMBER_DELETE_NAME_REQUIRED = "회원명을 정확히 입력하면 열립니다";

/** 확인 버튼 글자 */
export const MEMBER_DELETE_OK_LABEL = "지우기";
export const MEMBER_DELETE_PENDING_LABEL = "지우는 중…";

/** 성공 토스트 — 목록으로 돌아간 뒤 마지막으로 남는 자리라 복구 경로를 다시 말한다 */
export const MEMBER_DELETED_MESSAGE =
  "회원을 지웠습니다 — 이 분이 다시 로그인하면 기존 회원 정보와 연결할 수 있습니다";

/** 함께 지워질 것을 숫자로 — 판단할 유일한 단서다(폼·행사 삭제 시트가 건수를 보여 주는 자리와 같다) */
export function memberDeleteCascadeText(preview: MemberDeletionPreview): string {
  return `응답 ${preview.responseCount}건 · 행사 참가 ${preview.participationCount}건 · 이력 ${preview.historyCount}건이 함께 지워집니다`;
}

/**
 * 지울 수 없는 이유 — 이 회원이 남의 기록에 남아 있는 자리를 그대로 나열한다.
 *
 * 서버가 준 이름(«폼 작성자» «승인자» …)을 화면이 고치지 않는다 — 어느 자리가 막는지는
 * 서버만 알고(FK 20개), 화면이 목록을 들고 있으면 서버가 자리를 늘린 날 화면이 낡는다.
 */
export function memberDeleteBlockedText(blockedBy: readonly string[]): string {
  return `지울 수 없습니다 — 이 회원이 ${blockedBy.join(", ")}(으)로 남아 있습니다`;
}
