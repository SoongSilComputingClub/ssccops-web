import { mbrGrdNm, mbrSttsNm } from "@/entities/member";
import {
  RSPNS_STTS_BADGE,
  answerText,
  type AnswerColumn,
  type FormResponseDetail,
  type FormResponseItem,
} from "@/entities/response";
import { FIELD_LABEL } from "@/shared/config/labels";
import { formatDt } from "@/shared/lib/date";

/*
 * 응답을 CSV 한 장으로 옮기는 규칙 (ssccops#223).
 *
 * **답을 읽는 규칙은 여기 없다** — 엔티티의 `answerColumns`·`answerText`를 그대로 부른다.
 * 그 파일(`entities/response/model/answer-table.ts`) 주석이 이 이슈를 이름으로 가리키며 이유를
 * 적어 두었다: *"셋이 각자 답을 읽으면 «다중선택을 어떻게 한 칸에 적는가» 같은 규칙이 세 벌이
 * 되고, 그때 화면의 표와 내려받은 CSV가 다른 말을 한다."* 그래서 이 파일이 정하는 것은
 * **어떤 열을 어떤 순서로 세울 것인가** 하나다.
 *
 * **엔티티가 아니라 features인 이유**: 한 행에 응답(response)과 회원 표시명(member)이 함께
 * 들어간다. 엔티티 슬라이스끼리는 서로 참조하지 않는 것이 이 저장소의 FSD 규칙이고, 여러
 * 엔티티를 함께 다루는 로직은 features에 둔다. 표 보기(`answer-table.ts`)가 엔티티에 남아
 * 있는 것은 그쪽이 응답 하나만 알기 때문이다.
 *
 * ── 문항 구성 버전(qitem_ver) ────────────────────────────────
 *
 * **"비워 뒀다"와 "그때는 없던 문항이다"를 구별하지 않는다 — 둘 다 빈 칸이다.**
 * ssccops#227이 표 보기에서 이미 같은 판단을 했고 그 근거가 `answer-table.ts` 꼬리말에 있다:
 * 서버가 빈 값인 key를 저장하지 않으므로 둘이 `rspnsCn`에서 똑같이 "key 없음"으로 오는데,
 * 가르려면 `form_rspns_hstry.qitem_ver`가 필요하고 그 값은 목록·상세 어느 DTO에도 없다.
 *
 * 결론을 표와 맞추는 것이 요점이다 — 여기서만 "(문항 없음)" 같은 말을 넣으면 화면에서 빈 칸으로
 * 본 자리가 파일에서는 다른 말을 하고, 운영진은 둘 중 어느 쪽이 맞는지 알 길이 없다.
 */

/** CSV 한 장을 만들 때 화면이 정해 주는 것 */
export interface ResponseCsvInput {
  /** 지금 목록에 보이는 응답 — 상태 필터가 걸려 있으면 그 결과다 */
  responses: readonly FormResponseItem[];
  /** 문항 열 — 순서는 폼이 정한 그대로 (`answerColumns`) */
  columns: readonly AnswerColumn[];
  /** formRspnsId → 상세. 답과 연락처가 여기서 온다 */
  details: Readonly<Record<number, FormResponseDetail>>;
  /**
   * 연락처 열을 넣을 것인가 — `MEMBER_MANAGE` 보유 여부.
   *
   * ⚠️ **이것은 표시 경계이지 보안 경계가 아니다.** 응답 상세는 `RESPONSE_REVIEW` 하나로
   * 막혀 있고 `ResponseMemberDetail`은 권한과 무관하게 `telno`를 언제나 싣는다 — 즉 이 값이
   * false인 사람의 브라우저에도 연락처는 이미 도착해 있다. 진짜 경계를 세우려면 서버가
   * 권한 없는 요청에 `telno`를 비워 보내야 한다(ssccops#223에 남겼다).
   */
  includeTelno: boolean;
  /**
   * 응답 순번 열을 넣을 것인가.
   *
   * 1건 폼에서는 모든 행이 1이라 열 하나가 통째로 의미가 없다. 화면이 이름 옆 `N번째`를
   * 그리는 조건과 **같은 값**을 받는다 — 다르면 화면에서 구별되던 두 행이 파일에서 구별되지
   * 않는다.
   */
  includeRspnsSeq: boolean;
}

/**
 * 응답을 CSV 행 배열로 — 첫 줄이 머리글이다.
 *
 * 회원 정보를 학과·등급·상태 세 칸으로 나눠 적는 것은 화면과 갈리는 지점이다. 목록 표는 좁은
 * 폭에 맞추려고 셋을 한 칸에 `·`로 이어 붙이지만, CSV는 **정렬·필터를 걸려고 내려받는 파일**이라
 * 한 칸에 뭉쳐 두면 엑셀에서 다시 쪼개야 한다.
 *
 * 값이 없으면 화면처럼 `-`를 넣지 않고 **빈 칸으로 둔다** — `-`는 표시 규칙이고, 파일에 넣으면
 * 그 글자가 데이터가 되어 필터·집계에 섞인다(`answerText`가 대체 문구를 만들지 않는 것과 같은
 * 이유다).
 */
export function responseCsvRows(input: ResponseCsvInput): string[][] {
  const { responses, columns, details, includeTelno, includeRspnsSeq } = input;

  const header = [
    FIELD_LABEL.memberName,
    FIELD_LABEL.studentNumber,
    ...(includeRspnsSeq ? ["응답 순번"] : []),
    FIELD_LABEL.departmentName,
    FIELD_LABEL.membershipGrade,
    FIELD_LABEL.membershipStatus,
    ...(includeTelno ? ["연락처"] : []),
    FIELD_LABEL.submittedAt,
    FIELD_LABEL.responseStatus,
    ...columns.map((c) => c.label),
  ];

  const rows = responses.map((r) => {
    const detail = details[r.formRspnsId];
    return [
      r.member.mbrNm ?? "",
      r.member.stdntNo ?? "",
      ...(includeRspnsSeq ? [r.rspnsSeq === null ? "" : String(r.rspnsSeq)] : []),
      r.member.scsbjtNm ?? "",
      mbrGrdNm(r.member.mbrGrdCd),
      mbrSttsNm(r.member.mbrSttsCd),
      // 상세를 못 받은 건은 답도 연락처도 비운다 — 지어내지 않는다
      ...(includeTelno ? [detail?.member.telno ?? ""] : []),
      formatDt(r.sbmsnDt),
      RSPNS_STTS_BADGE[r.rspnsSttsCd].label,
      ...columns.map((c) => answerText(detail?.rspnsCn, c.qitemId)),
    ];
  });

  return [header, ...rows];
}

/**
 * 내려받을 파일 이름.
 *
 * 폼 제목을 그대로 쓰되 파일명에 못 쓰는 글자(`\ / : * ? " < > |`)와 앞뒤 공백·마침표를
 * 걷어낸다 — 윈도우에서 그런 이름은 저장 자체가 실패한다. 걷어내고 나서 빈 문자열이 되면
 * (제목이 기호뿐인 폼) 폼 번호로 떨어진다.
 *
 * 날짜를 붙이는 것은 같은 폼을 며칠에 걸쳐 여러 번 내려받기 때문이다 — 붙이지 않으면
 * 내려받기 폴더에서 `(1)`·`(2)`가 되어 어느 것이 최신인지 파일 이름으로 알 수 없다.
 */
export function responseCsvFilename(
  formId: number,
  formTitle: string | null | undefined,
  today: string,
): string {
  const safe = (formTitle ?? "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "");
  return `${safe || `폼_${formId}`}_응답_${today}.csv`;
}
