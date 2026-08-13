export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface SubWork {
  id: string; // t1…
  title: string;
  owner: string; // "이종인 · 학술국장"
  collab: string;
  due: string; // "8월 20일"
  dday: string; // "D-3"
  type: string; // 행사 · 회계정산 · 공지홍보 · 스터디 · 회의 · 문서
  stage: number; // 1 기획 · 2 진행 · 3 검토 · 4 완료
  progress: number; // 0-100
  flag: string; // "" · 마감임박 · 지연
  content: string;
  link: string;
  approval: string; // "" · 대기
  checklist: ChecklistItem[];
  reject?: string; // 반려 사유
}
