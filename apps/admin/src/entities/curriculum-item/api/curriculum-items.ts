import { apiFetch } from "@/shared/lib/api/client";
import type { SesnSttsCd } from "@/shared/config/codes";
import type { CurriculumItemWithSession } from "../model/types";

/*
 * 커리큘럼 조회 API (#134 · ADR 없음 — 슬라이스 경계 정리는 #701 · ssccops#516).
 *
 * **이 파일이 왜 여기 생겼나.** 조회 함수·응답 타입·매퍼가 `entities/academic-program/api` 에
 * 있었고, 그쪽이 이 슬라이스의 도메인 타입을 **가져다 쓰고 있었다** — 같은 레이어의 슬라이스끼리
 * 참조하지 않는다는 규칙(루트 `AGENTS.md`)에 어긋나는 자리였다.
 *
 * 방향을 뒤집는 대신(활동 쪽으로 타입을 옮기는 것) 조회를 **타입이 있는 쪽으로** 데려왔다.
 * 이 저장소는 엔티티를 표 단위로 두는데(`crclm_artcl`) 그 슬라이스가 타입만 들고 API 는 남의
 * 슬라이스에 있는 것이 거꾸로였기 때문이다. 이제 다른 모든 슬라이스와 같은 모양이다
 * (`entities/<slice>/{api,model}`).
 *
 * **경로에 `academic-programs` 가 들어가는 것은 그대로다** — 서버가 활동 아래에 둔 하위 자원이고
 * URL 은 서버 소관이다. 그것이 슬라이스 소유를 정하지는 않는다.
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 활동·폼·업무 도메인이 잡아 둔 규칙
 * 그대로다. 여기서 도메인 타입으로 옮기고 나면 계약이 바뀌었을 때 고칠 곳은 아래 `to*` 하나다.
 */

interface CurriculumItemWithSessionResponse {
  curriculumItemId: number;
  seqno: number | null;
  ttl: string | null;
  planYmd: string | null;
  sessionId: number | null;
  sesnSttsCd: SesnSttsCd;
  actlYmd: string | null;
  prgrsCn: string | null;
  isEditable: boolean;
}

function toCurriculumItem(
  res: CurriculumItemWithSessionResponse,
): CurriculumItemWithSession {
  return {
    curriculumItemId: res.curriculumItemId,
    seqno: res.seqno,
    title: res.ttl ?? "",
    planYmd: res.planYmd,
    sessionId: res.sessionId,
    sesnSttsCd: res.sesnSttsCd,
    actualYmd: res.actlYmd,
    progressContent: res.prgrsCn,
    isEditable: res.isEditable,
  };
}

/**
 * GET /v1/academic-programs/{academicProgramId}/curriculum-items — 커리큘럼 (#134).
 *
 * 계획(crclm_artcl) + 실적(sesn) 조인 배열이다. 활동 상세 화면의 "커리큘럼 대비 진행" 표
 * 하나가 이 배열을 그대로 쓴다. 페이징이 없다(활동당 회차 수가 적다) — `apiFetch` 로 받는다.
 * 실적이 없는 회차도 `sesnSttsCd` 에 NOT_SUBMITTED 가 채워지므로 화면은 null 분기를 두지
 * 않는다.
 */
export async function fetchCurriculumItems(
  academicProgramId: number,
): Promise<CurriculumItemWithSession[]> {
  const items = await apiFetch<CurriculumItemWithSessionResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/curriculum-items`,
  );
  return (items ?? []).map(toCurriculumItem);
}
