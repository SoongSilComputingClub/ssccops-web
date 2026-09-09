/**
 * 공유 링크 미리보기 — 서버가 익명으로 내주는 최소한의 것 (ADR-0016).
 *
 * 제목과 요약뿐이고 상태·마감·인원 같은 변하는 값이 없는 것은 **카드가 한 번 굳기 때문이다**
 * (ssccops#194 제약 ②) — 마감된 뒤에도 모집 중이라 말하는 카드가 남는다.
 */
export interface SharePreview {
  /**
   * 서버가 준 대상 구분 코드 **그대로**다. `ShareTargetType`으로 좁히지 않는 것은 서버만 먼저
   * 배포되면 이 웹이 모르는 값이 올 수 있기 때문이며, 아는 값인지는 착지 화면이
   * `isShareTargetType`으로 묻는다.
   */
  trgtSeCd: string;
  trgtId: number;
  title: string;
  summary: string | null;
}
