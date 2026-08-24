/*
 * @ssccops/form-renderer — 폼 문항 렌더링과 응답 검증.
 *
 * 어드민(`apps/admin`)의 응답자 화면에서 뽑아 왔다. 공개 행사 앱(`apps/events`)이 신청 흐름을
 * 붙일 때 렌더러를 복사하지 않게 하려는 것이다 — 복사하면 클라이언트 검증 규칙이 두 벌이 되고,
 * 그중 한 벌만 고쳐지는 순간 서버 검증과 어긋난다(SoongSilComputingClub/ssccops#136 · wave2 D15).
 *
 * ── 여기 있는 것 ────────────────────────────────────────────
 * 폼/응답 도메인 타입 · 문항 유형 코드 · 답 상태 다루기(선택 토글 · 저장 본문) ·
 * 분기 경로 계산 · 클라이언트 검증(필수 · 정규식 · 최대 선택 수) · 문항 유형별 렌더링.
 *
 * ── 여기 없는 것 ────────────────────────────────────────────
 * HTTP 호출과 자동 저장·제출 훅, 화면 셸, 권한 게이트. 두 앱의 클라이언트가 다르고(어드민
 * `apiFetch`는 401에 리다이렉트를 걸지만 공개 앱은 걸지 않는다) 화면 문구·이동 규칙도 다르다.
 * 이 패키지는 전송 계층을 모르는 채로 둔다.
 */

export type { AnswerValue, FormPage, Qitem, QitemCpstCn, RspnsCn } from "./model/types";
export type { QitemTypeCd } from "./model/qitem-type";
export {
  QITEM_TYPE_CDS,
  QITEM_TYPE_NM,
  isChoiceQitemType,
  isTextQitemType,
} from "./model/qitem-type";
export {
  nextPageSeq,
  pageSeqOf,
  reachedPageSeqs,
  selectedOptions,
  toRspnsCn,
  toggleOption,
  validateAnswers,
  validatePageAnswers,
} from "./model/answers";
export { QitemCard } from "./ui/qitem-card";
