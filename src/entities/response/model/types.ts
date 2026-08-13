export type ResponseStatus = "SUBMITTED" | "DRAFT" | "ACCEPTED" | "REJECTED";

export interface FormResponse {
  id: string; // resp1…
  form: string; // 폼 key (f1…)
  member: string | null; // 회원 key, 비회원 응답은 null
  status: ResponseStatus;
  at: string;
  answers: Record<string, string>;
  /** 비회원(공개 폼) 응답 식별 정보 */
  guest?: { name: string; sid: string; dept: string; phone: string };
}
