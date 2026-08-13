export interface AgendaItem {
  no: number;
  name: string;
  kind: string; // 논의 · 결정 · 보고
  op: string; // 연결 운영 id (w* 또는 t*)
  note: string;
  result: string;
}

export interface Meeting {
  id: string; // mt1…
  kind: string; // 정례 · 주제
  title: string;
  date: string; // "2026-08-12 19:00"
  place: string;
  chair: string;
  status: string; // 예정 · 진행 · 종료 · 취소
  target: string; // 전체 · 국장단 · 임시소집 …
  agenda: AgendaItem[];
}
