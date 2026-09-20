import type { BadgeTone } from "@/shared/ui";
import type { AcdmActvSttsCd, SesnSttsCd } from "@/shared/config/codes";

/*
 * 학술 활동·회차 상태 → 배지 톤 (#125).
 *
 * **상태**의 표시명은 여기서 만들지 않는다 — ACDM_ACTV_STTS_NM·SESN_STTS_NM(shared/config/codes.ts)이
 * 그 자리다(코드 → 이름 사전은 한 곳). 여기는 그 코드에 어떤 색을 입힐지만 정한다
 * (workSttsTone과 같은 자리).
 *
 * **활동 유형만 예외로 이 파일이 표시명을 갖는다** (#568 · 아래 acdmActvTypeNm). codes.ts는
 * 값 집합이 닫힌 고정 enum의 자리이고(유니온 타입 + codesOf가 그것을 전제한다), 활동 유형은
 * 배포 없이 늘어나는 런타임 코드테이블이라 그 모양에 들어가지 않는다.
 */

/** 활동 상태 배지 톤 — 승인(대기 느낌) · 진행 중(파랑) · 수료(회색으로 마감) */
export function acdmActvSttsTone(cd: AcdmActvSttsCd): BadgeTone {
  if (cd === "ONGOING") return "blue";
  if (cd === "COMPLETED") return "grey";
  return "amber";
}

/** 회차 실적 상태 배지 톤 — 미제출은 옅게, 제출은 검토 대기(amber), 승인은 파랑, 수정요청은 빨강 */
export function sesnSttsTone(cd: SesnSttsCd): BadgeTone {
  switch (cd) {
    case "APPROVED":
      return "blue";
    case "SUBMITTED":
      return "amber";
    case "REVISION_REQUESTED":
      return "outline-red";
    default:
      return "outline";
  }
}

/**
 * 활동 유형 표시명 (#568 · 서버 #510).
 *
 * 목록·횡단 조회 응답에는 `typeCd`(런타임 코드테이블의 PK 문자열)만 오고 표시명이 없어, 배지가
 * `STUDY`·`PROJECT`처럼 코드 그대로 떠 있었다. 활동 **상세**(`typeName`)는 서버가 이름을 주므로
 * 그쪽은 이 함수를 쓰지 않는다 — 서버가 답하는 자리에 화면 맵을 끼우면 운영진이 유형 관리에서
 * 이름을 바꿨을 때 같은 사실이 두 벌이 된다.
 *
 * **이름은 서버 `acdm_actv_type.type_nm`과 글자까지 같아야 한다.** 기획안 응답은 유형을 문자열로
 * 저장하고 승인 이관이 그것을 코드로 되돌린다(서버 `ProposalResponseParser`).
 *
 * lms에 같은 함수가 있다(`entities/academic-program/model/display.ts`). **앱끼리 소스를 공유하지
 * 않으므로**(루트 AGENTS.md) 옮겨 적었다 — 20줄짜리 맵 하나라 `packages/`로 올릴 덩어리가 아니다.
 * 유형이 늘면 두 곳을 함께 고친다.
 *
 * 모르는 코드는 **코드 그대로** 보여 준다 — «기타»로 뭉개면 새 유형이 들어온 것을 아무도 모른다.
 */
const ACADEMIC_PROGRAM_TYPE_NM: Record<string, string> = {
  STUDY: "스터디",
  PROJECT: "프로젝트",
  TRACK: "트랙",
};

export function acdmActvTypeNm(typeCd: string): string {
  return ACADEMIC_PROGRAM_TYPE_NM[typeCd] ?? typeCd;
}
