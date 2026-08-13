export type FormStatus = "DRAFT" | "OPEN" | "CLOSED";

export interface FormPage {
  title: string;
  desc: string;
}

export interface Question {
  qid: string;
  label: string;
  type: string; // 단답형 · 장문형 · 단일선택 · 다중선택 · 날짜
  required: boolean;
  /** 0-based 페이지 인덱스 (페이지 1개짜리 폼은 생략) */
  page?: number;
  options: string[];
  /** 단일선택 분기: 선택지 → 이동할 페이지 인덱스 */
  branch?: Record<string, number>;
  pattern?: string;
  patternName?: string;
  patternMsg?: string;
  /** 다중선택 최대 개수 */
  maxSelect?: number;
}

export interface Form {
  id: string; // FORM-0012
  key: string; // f1 (URL 파라미터)
  title: string;
  slug: string;
  status: FormStatus;
  labels: string[];
  start: string;
  end: string;
  dup: boolean; // 중복 제출 허용
  by: string;
  created: string;
  updated: string;
  pages: FormPage[];
  questions: Question[];
}

export interface FormLabel {
  name: string;
  on: boolean;
}
