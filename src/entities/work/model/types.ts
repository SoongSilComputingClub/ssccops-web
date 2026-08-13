export interface Work {
  id: string; // w1…
  name: string;
  type: string; // 행사 · 상시 · 정례운영
  status: string; // 기획 · 검토 · 진행 · 완료 · 보류 · 취소
  term: string; // 제38대
  dept: string;
  owner: string;
  start: string;
  end: string;
  note: string; // 회고 내용
  subs: string[]; // 하위 업무 id 목록
}
