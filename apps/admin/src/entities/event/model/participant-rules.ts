import { PTCP_RGST_STTS_CDS, type PtcpSttsCd } from "@/shared/config/codes";

/*
 * 참가자 등록 규칙 (ssccops#308 · #423).
 *
 * **정원이 없는 행사에는 «대기»가 없다.** 대기는 정원을 넘겼을 때 순번을 기다리는 상태인데
 * 정원(`ptcpLmtCnt`)이 null이면 넘길 선이 없어 대기로 보내는 조작이 뜻을 잃는다 — 운영자가
 * "대기가 뭐냐"고 물은 것이 이 규칙의 출발이다. 서버는 거절하지 않는다(D5 — 정원은 참고치라
 * WAITLISTED 등록도 받는다); 화면이 **보내는 조작만** 감춘다. 이미 대기인 줄의 «확정으로 올리기»
 * 는 남는다 — 정원을 지운 뒤에도 대기자를 꺼내 올릴 길이 있어야 한다.
 *
 * 신청 목록의 등록 버튼과 회원 직접 추가 시트가 같은 함수를 쓴다 — 화면마다 `ptcpLmtCnt`를
 * 보고 따로 거르면 한쪽만 고쳐지는 날이 온다.
 */

/** 등록 시점에 고를 수 있는 상태 — 정원이 없으면 확정뿐이다 */
export function registerableStatuses(ptcpLmtCnt: number | null): readonly PtcpSttsCd[] {
  return ptcpLmtCnt === null
    ? PTCP_RGST_STTS_CDS.filter((cd) => cd !== "WAITLISTED")
    : PTCP_RGST_STTS_CDS;
}

/** 요약 카드 아래 한 줄 — 확정·대기가 무엇인지 (ssccops#308) */
export const PTCP_STATUS_HINT =
  "확정은 참가 인원으로 집계됩니다 · 대기는 정원을 넘겼을 때 순번을 기다리는 상태입니다";
