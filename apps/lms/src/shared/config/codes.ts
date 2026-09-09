/*
 * 표준코드·표시명 — 구현은 `@ssccops/codes`에 있다 (ssccops#243).
 *
 * 이 앱이 쓰는 코드값(응답 상태·검토 처리 구분)은 어드민과 **글자까지 같은 사본**이었다.
 * 예전 주석이 그 상태를 알고도 감수하고 있었다 — *"두 앱은 소스를 공유하지 않으므로, 서버
 * 표준코드가 바뀌면 두 곳을 함께 본다."* 그런데 AGENTS.md는 *"한글 표시명은 이 파일에서만
 * 만든다"*고 못 박고 있었고, 서버가 바뀔 때 한 곳만 고쳐도 아무도 모르는 상태였다.
 *
 * 이 파일을 남겨 두는 것은 `@/shared/config/codes`를 부르는 자리를 건드리지 않기 위해서다.
 * 이 앱만 쓰는 코드값이 생기면 여기 더하면 된다 — 공유 코드값과 한 자리에서 온다.
 */
export {
  RSPNS_STTS_CDS,
  RSPNS_STTS_NM,
  RSPNS_STTS_TERMINAL_CDS,
  RVW_PRCS_SE_CDS,
  RVW_PRCS_SE_NM,
  isRspnsSttsTerminal,
  type RspnsSttsCd,
  type RvwPrcsSeCd,
} from "@ssccops/codes";
