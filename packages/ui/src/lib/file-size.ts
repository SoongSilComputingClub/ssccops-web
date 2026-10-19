/*
 * 바이트 → «12.3MB» 표기 (web#805 · ssccops#607).
 *
 * 기획안 첨부 자료가 세 앱(lms 작성·재제출 · admin 검토 · www 학술 프로그램 상세)에 같은 목록으로
 * 서고, lms 카드 머리의 «사용 12.3MB / 20MB»가 같은 함수를 쓴다. 앱마다 사본을 두면 한 화면은
 * «20.0MB», 다른 화면은 «20MB»가 되고 그 차이를 타입도 린트도 잡지 못한다.
 *
 * **1024 단위다** — 서버 상한이 `20 × 1024 × 1024` 바이트이고 413 메시지가 그 값을 «20MB»로
 * 부른다(server#685). 1000 단위로 세면 화면의 «21MB»와 서버의 «20MB»가 같은 값이 된다.
 *
 * MB는 소수 한 자리이되 `.0`은 떼어 낸다(«20MB» · «12.3MB»). 값이 없으면 빈 문자열이다 — «-»를
 * 쓸지는 그리는 쪽이 정한다(`@ssccops/date`와 같은 선 긋기).
 */

const KIB = 1024;
const MIB = 1024 * 1024;

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < KIB) return `${bytes}B`;
  const kb = Math.round(bytes / KIB);
  // 1023.6KB가 «1024KB»로 반올림되는 자리는 MB로 넘긴다
  if (kb < 1024) return `${kb}KB`;
  return `${Number((bytes / MIB).toFixed(1))}MB`;
}
