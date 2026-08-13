export interface CalEvent {
  id: string;
  m: number; // 월 (1-based)
  d: number; // 일
  dow: string;
  type: string; // 스터디 · 회의 · 행사 · 마감
  title: string;
  task: string; // 연결 하위 업무 id ("" 가능)
}
