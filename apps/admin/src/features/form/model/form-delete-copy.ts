import { CAPABILITY, type Capability } from "@/entities/session";

/*
 * 폼 삭제·복구의 **요구 권한과 그 사유 문구** (ssccops-web#359 · ssccops-server#329).
 *
 * 한 파일에 둔 것은 둘이 같은 판단의 앞뒷면이기 때문이다 — 잠긴 버튼의 `title`과 서버가
 * 거절했을 때의 문장이 갈리면 같은 상황을 두 가지 일로 읽는다(시스템 폼 잠금이 같은 이유로
 * entities/form/model/display.ts에 문장을 모아 둔 것과 같은 판단).
 */

/**
 * 삭제·복구에 요구하는 권한. **서버가 `FORM_WRITE`로 확정했다** (ssccops-server#329 · PR #330).
 *
 * ── 왜 `FORM_WRITE`인가 ────────────────────────────────────────
 * 전용 `FORM_DELETE`를 만들지 않은 근거를 서버가 남겼다 — `FORM_WRITE` 보유자는 이미 PUT
 * 하나로 제목을 지우고 문항을 통째로 갈아엎을 수 있고, 소프트 삭제는 그중 유일하게 되돌릴
 * 수 있는 조작이다. 회의 삭제에 `MEETING_DELETE`가 따로 있는 것(서버 #125)은 "삭제만 따로
 * 떼어 준다"는 요구가 운영 도메인에 실제로 있었기 때문이고 폼에는 그것이 없다.
 *
 * **되살리기가 같은 권한인 것이 요점이다** — 지울 수 있는 사람이 되돌릴 수 없으면 자기가
 * 저지른 것을 스스로 수습하지 못한다. 다만 **휴지통 목록만 `FORM_READ`**이며(서버가 별도
 * 경로 `GET /v1/forms/deleted`에 그렇게 걸었다), 그래서 목차의 잠금은 `FORM_READ`이고
 * (`app/(admin)/_shell/nav.ts`) 이 상수는 화면 안의 버튼만 잠근다.
 */
export const FORM_DELETE_CAPABILITY: Capability = CAPABILITY.FORM_WRITE;

/**
 * 잠긴 삭제·복구 버튼에 붙는 사유이자 403의 문장.
 *
 * 요구 권한을 이름으로 밝히는 것은 AGENTS.md §화면 문구의 규칙이다 — 막힌 사람도, 권한을
 * 주려는 사람도 무엇이 필요한지 알아야 한다. 표기는 폼 편집 화면과 같은 `폼 작성·수정`이다.
 */
export const NO_FORM_DELETE =
  "폼을 지우거나 되살릴 권한이 없습니다 — 폼 작성·수정(FORM_WRITE) 권한이 필요합니다";
