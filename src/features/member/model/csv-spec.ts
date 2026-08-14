/** CSV 회원 이관 위저드의 시뮬레이션 데이터 (원본 프로토타입 그대로) */

export const CSV_STEPS = ["파일 선택", "컬럼 매핑", "사전 검증", "이관 실행"] as const;

export const CSV_SPEC_ROWS = [
  { col: "이름", req: "필수", desc: "실명", ex: "김도현" },
  { col: "학번", req: "조건부", desc: "재학생 필수 · 졸업생 생략 가능", ex: "202011234" },
  { col: "기수", req: "선택", desc: "미입력 시 학번으로 추정", ex: "12" },
  { col: "학과", req: "선택", desc: "", ex: "컴퓨터공학과" },
  { col: "학년", req: "선택", desc: "1~4 · 졸업생은 공란", ex: "3" },
  { col: "연락처번호", req: "필수", desc: "하이픈 포함/미포함 모두 허용", ex: "010-2345-1122" },
  { col: "이메일", req: "선택", desc: "소셜 연동 시 자동 채움", ex: "dohyun@sscc.kr" },
  { col: "등급", req: "필수", desc: "임시회원 · 준회원 · 활동회원 · 정회원", ex: "정회원" },
  { col: "상태", req: "필수", desc: "재학 · 일반휴학 · 군휴학 · 졸업 · 탈퇴", ex: "재학" },
  { col: "졸업연도", req: "선택", desc: "대응 컬럼 없음 · 이관하지 않음", ex: "2026" },
  { col: "가입일", req: "선택", desc: "YYYY-MM-DD · 미입력 시 이관일", ex: "2020-03-02" },
  { col: "역할", req: "선택", desc: "쉼표로 복수 · 없는 역할은 검증에서 경고", ex: "회장,프로젝트장" },
] as const;

export const CSV_SAMPLE = `이름,학번,기수,학과,학년,연락처번호,이메일,등급,상태,졸업연도,가입일,역할
김도현,202011234,12,컴퓨터공학과,3,010-2345-1122,dohyun@sscc.kr,정회원,재학,,2020-03-02,"회장,프로젝트장"
이서연,202112045,13,소프트웨어학과,2,010-8842-0031,,활동회원,재학,,2021-03-04,국장
정민석,,10,소프트웨어학과,,010-7788-2200,minseok@sscc.kr,정회원,졸업,2026,2018-03-05,`;

/** CSV 헤더 → mbr 컬럼ID 기본 매핑 ("" = 매핑 안함) */
export const CSV_DEFAULT_MAP: Record<string, string> = {
  이름: "mbrNm",
  학번: "stdntNo",
  기수: "genNo",
  학과: "scsbjtNm",
  학년: "scyrNo",
  연락처번호: "telno",
  이메일: "eml",
  등급: "mbrGrdCd",
  상태: "mbrSttsCd",
  졸업연도: "",
  가입일: "joinYmd",
  역할: "",
};

export const CSV_STATS = { total: 128, ok: 119, error: 6, dup: 3 } as const;

export const CSV_ERRORS = [
  { row: 14, target: "(회원명 없음)", reason: "필수값 누락 · 회원명" },
  { row: 37, target: "오세현 202112044", reason: "학생번호 중복 후보" },
  { row: 58, target: "김하늘 20231234", reason: "잘못된 기수 형식 (14-1)" },
  { row: 92, target: "이도윤 202312001", reason: "존재하지 않는 회원상태 · 휴학중" },
] as const;

export const CSV_RESULTS = [
  { row: 14, target: "(회원명 없음)", result: "실패" },
  { row: 37, target: "오세현", result: "중복 후보" },
  { row: 41, target: "서지훈", result: "성공" },
] as const;
