import type { EventParticipant } from "@/entities/event";
import { PTCP_STTS_NM } from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { formatDt } from "@/shared/lib/date";

/*
 * 참가자 명단 CSV의 행 (#545 · ssccops#409). 응답 CSV(`features/response/model/response-csv.ts`)와
 * 같은 모양이고 **명단 API가 주는 값만** 싣는다 — 이름·학번·참가 상태·등록 일시. 연락처는 명단
 * 응답에 없고(응답 CSV는 상세를 한 번 더 불러 얻는다) 명단은 출석·인원 확인용이라 개인 연락처가
 * 필요하면 별도 결정이다.
 *
 * 순번은 등록 순서(서버가 그 순서로 내린다)다 — 화면 표의 순번과 같다.
 */
export function participantCsvRows(participants: readonly EventParticipant[]): string[][] {
  const header = ["순번", FIELD_LABEL.memberName, FIELD_LABEL.studentNumber, "참가 상태", "등록 일시"];
  const rows = participants.map((p, i) => [
    String(i + 1),
    p.mbrNm,
    p.stdntNo,
    PTCP_STTS_NM[p.ptcpSttsCd],
    formatDt(p.crtDt) ?? "",
  ]);
  return [header, ...rows];
}

/** `행사명_참가자_YYYY-MM-DD.csv` — 파일 이름에 못 쓰는 글자는 `_` */
export function participantCsvFilename(eventTtl: string, today: string): string {
  const safe = eventTtl.replace(/[\\/:*?"<>|]/g, "_").trim() || "행사";
  return `${safe}_참가자_${today}.csv`;
}
