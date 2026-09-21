import type { AcademicProgramRef, PublicEventSummary } from "./types";

/*
 * 행사형과 학술 프로그램을 가르는 자리 (#587 · ssccops#435 · ADR-0043).
 *
 * www의 축은 각각 **한 종류의 데이터**를 본다 — 행사(`/events`·홈 일정)는 행사형 `event`만,
 * 학술(`/academic`)은 `acdm_prgrm`이 딸린 것만. 같은 공개 목록(`/public/v1/events`)에서 갈라
 * 내는 것은 서버에 필터 파라미터를 더하지 않기로 해서다(목록이 전량이라 화면이 가른다).
 *
 * 판정은 `academicProgram`의 유무 하나다. 분류(`eventClsfCd`)로 가르지 않는 이유는 types.ts
 * `AcademicProgramRef` 주석 — 분류는 운영진이 바꾸는 값이라 정본이 아니다.
 */

/** 학술 프로그램 행사인가 — `acdm_prgrm` 행이 있어 서버가 `academicProgram`을 실어 준 것 */
export function isAcademicProgramEvent(event: PublicEventSummary): boolean {
  return event.academicProgram !== null;
}

/** 행사 축이 보는 것 — 학술 프로그램을 뺀 행사형만 */
export function excludeAcademicPrograms(events: PublicEventSummary[]): PublicEventSummary[] {
  return events.filter((event) => !isAcademicProgramEvent(event));
}

/** 학술 축이 보는 것 — 학술 프로그램만 */
export function onlyAcademicPrograms(events: PublicEventSummary[]): PublicEventSummary[] {
  return events.filter(isAcademicProgramEvent);
}

/** 유형(스터디·프로젝트·트랙) 하나와 그 유형의 프로그램 행사들 */
export interface AcademicProgramGroup {
  typeCd: AcademicProgramRef["typeCd"];
  typeNm: AcademicProgramRef["typeNm"];
  events: PublicEventSummary[];
}

/**
 * 학술 프로그램 행사를 유형별로 묶는다 — `/academic`의 «모집 중인 학술 프로그램» 절이 유형 칩
 * 아래 카드를 세우는 데 쓴다.
 *
 * 순서는 서버가 준 목록에서 먼저 나온 유형이 먼저다(분류 칩 `toClassifications`와 같은 규칙) —
 * 이름순으로 다시 세우면 유형 관리 화면의 순번과 어긋난다. 프로그램이 아닌 행사가 섞여 들어와도
 * 여기서 걸러 낸다(호출부가 `onlyAcademicPrograms`를 먼저 거치지 않아도 결과가 같다).
 */
export function groupByProgramType(events: PublicEventSummary[]): AcademicProgramGroup[] {
  const groups = new Map<string, AcademicProgramGroup>();
  for (const event of events) {
    const program = event.academicProgram;
    if (!program) continue;
    const group = groups.get(program.typeCd);
    if (group) {
      group.events.push(event);
    } else {
      groups.set(program.typeCd, {
        typeCd: program.typeCd,
        typeNm: program.typeNm,
        events: [event],
      });
    }
  }
  return [...groups.values()];
}
