export interface MemberRole {
  name: string;
  from: string;
  to: string; // ""=재임 중
  primary: boolean;
}

export interface Member {
  id: string; // MEM-0001
  key: string; // m1 (URL 파라미터)
  name: string;
  sid: string; // 학생번호
  cohort: string; // 기수 ("미배정" 가능)
  dept: string;
  year: string; // 학년
  phone: string;
  email: string;
  grade: string; // 임시회원 · 준회원 · 활동회원 · 정회원
  status: string; // 재학 · 군휴학 · 졸업 …
  joined: string;
  roles: MemberRole[];
  gradYear?: string;
  kind?: string; // 재학생 | 졸업생
  provider?: string; // 소셜 가입 제공자
}

export interface RefItem {
  name: string;
  on: boolean;
}

export interface MemberHistory {
  type: string; // 등급 · 상태 · 역할 · 기본정보
  member: string;
  from: string;
  to: string;
  reason: string;
  by: string;
  at: string;
}

export interface SocialLink {
  p: string; // GOOGLE · GITHUB · NAVER · KAKAO
  account: string;
  linked: string;
  last: string;
  primary: boolean;
}
