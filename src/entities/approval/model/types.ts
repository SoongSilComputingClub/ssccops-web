export interface Quorum {
  need: number;
  yes: number;
  no: number;
}

export interface Approval {
  id: string; // a1…
  task: string; // 연결 하위 업무 id
  title: string;
  type: string; // 하위 업무 유형명
  owner: string;
  requested: string;
  stage: string; // "2단계 / 회장"
  urgent: boolean;
  post: boolean; // 사후 승인
  quorum: Quorum | null;
  state: string; // 대기 · 승인 · 반려
  reason: string;
}
