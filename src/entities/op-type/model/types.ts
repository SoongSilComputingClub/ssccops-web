export interface OpType {
  name: string;
  approval: boolean;
  role: string; // 승인자 역할 ("-"=없음)
  quorum: boolean;
  quorumN: number;
  amount: string; // 기준 금액 ("-"=없음)
  spend: boolean;
  check: string; // 완료 점검 항목
  on: boolean;
}
