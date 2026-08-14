import type { Qitem, QitemCpstCn } from "@/entities/form";
import type { RspnsCn } from "@/entities/response";
import { isChoiceQitemType } from "@/shared/config/codes";
import { isTextQitemType } from "./form-validation";

/*
 * 응답자 화면의 답 다루기 — 저장 형태 · 분기 경로 · 제출 전 검증.
 *
 * ── 저장 형태를 화면 상태에서부터 맞춘다 ──────────────────────
 * 저장 계약은 **다중선택만 배열, 나머지는 문자열**이다(ssccops-server ResponseContent).
 * 예전 화면은 단일선택도 `[option]`으로 들고 있었고 서버가 벗겨 굳혀 주었는데, 그러면
 * 자동 저장이 복원해 온 값(문자열)과 화면이 만든 값(배열)의 모양이 달라 같은 답인데도
 * "바뀐 것"으로 잡혀 저장이 한 번 더 나간다. 그래서 화면 상태부터 저장 형태로 둔다.
 *
 * ── 분기로 건너뛴 페이지 ──────────────────────────────────────
 * 아래 `reachedPageSeqs`는 서버 `ResponseAnswerValidator.reachedPages`와 **같은 규칙**이다.
 * 어긋나면 웹은 통과시키는데 서버가 필수 누락으로 거절하는(또는 그 반대인) 폼이 생기고,
 * 응답자는 어느 칸을 채워야 하는지 알 수 없는 상태에 놓인다. 고칠 때는 양쪽을 같이 고칠 것.
 */

/** 분기가 아무리 얽혀도 이만큼 돌면 멈춘다 — 서버 MAX_PAGE_HOPS와 같은 값 */
const MAX_PAGE_HOPS = 1000;

/** `pageSeq` 생략은 첫 페이지를 뜻한다 (서버 `pageSeqOf`와 같은 해석) */
export function pageSeqOf(qitem: Qitem): number {
  return qitem.pageSeq ?? 0;
}

/** 선택형 문항의 현재 선택지들 — 단일선택은 문자열 하나를 배열로 감싸 돌려준다 */
export function selectedOptions(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : value ? [value] : [];
}

/**
 * 서버에 실제로 저장되는 형태의 답 — 저장할 것이 없으면 null.
 *
 * **본문 만들기(`toRspnsCn`)와 필수 판정(`validateAnswers`)이 같은 기준을 봐야 한다.**
 * 서버는 `normalize()`가 빈 값(`""`·`" "`·`[]`)을 떨궈 낸 **뒤** 남은 key로 필수를 판정하고
 * (`requireAnswersOnReachedPages`의 `answers.containsKey`), 웹도 빈 값은 본문에 싣지 않는다.
 * 그런데 필수 판정만 "화면에 글자가 있는가"로 보면 공백만 친 필수 문항이 화면에서는 통과하고
 * 서버에서 400 `REQUIRED_ANSWER_MISSING`으로 튕긴다 — 보낸 본문에 그 key가 없으니 서버에게는
 * 답이 아예 없는 것이다. 어느 칸이 문제인지 짚어 주지 못한 채 배너 한 줄만 뜨는 종류의 어긋남이라
 * 두 곳이 이 함수 하나를 보게 한다.
 *
 * 공백은 **비었는지 판단할 때만** 잘라 낸다. 서버도 `isBlank()`로 버릴지만 정하고 값은 원문
 * 그대로 저장하므로(`normalizeText`), 정규식 검사도 양쪽이 같은 문자열을 본다.
 */
function keptAnswerOf(
  qitem: Qitem,
  value: string | string[] | undefined,
): string | string[] | null {
  if (qitem.qitemTypeCd === "MULTI_CHOICE") {
    const picked = selectedOptions(value).filter((o) => o.trim() !== "");
    return picked.length > 0 ? picked : null;
  }
  // 단일선택·텍스트·날짜는 전부 문자열이다. 배열이 남아 있으면 첫 칸만 굳힌다
  const text = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return text.trim() !== "" ? text : null;
}

/**
 * 선택지 하나를 눌렀을 때의 다음 값.
 *
 * 단일선택은 문자열로 **갈아치우고**, 다중선택은 배열에서 토글한다. 최대 선택 수를 넘기는
 * 선택은 애초에 만들지 않는다 — 서버는 자동 저장에서 이 규칙을 보지 않으므로(작성 중에는
 * 셋을 고른 뒤 하나를 지우는 순서가 정상이다) 여기서 막지 않으면 제출에서야 드러난다.
 */
export function toggleOption(
  qitem: Qitem,
  value: string | string[] | undefined,
  option: string,
): string | string[] {
  if (qitem.qitemTypeCd !== "MULTI_CHOICE") return option;

  const current = selectedOptions(value);
  if (current.includes(option)) return current.filter((o) => o !== option);
  if (qitem.maxSlctCnt && current.length >= qitem.maxSlctCnt) return current;
  return [...current, option];
}

/* ── 분기 경로 ─────────────────────────────────────────────── */

/**
 * 이 페이지에서 분기가 걸리는가 — 걸리지 않으면 null.
 *
 * 분기표가 있는 단일선택 문항 중 **답이 분기표의 key와 맞는 첫 문항**이 목적지를 정한다.
 * 한 페이지에 분기 문항이 여럿이면 문항 구성 순서상 첫 번째가 이긴다(서버도 같다).
 */
function branchTargetOf(
  composition: QitemCpstCn,
  page: number,
  answers: RspnsCn,
): number | null {
  for (const qitem of composition.qitems) {
    if (pageSeqOf(qitem) !== page) continue;
    if (qitem.qitemTypeCd !== "SINGLE_CHOICE" || !qitem.branchMap) continue;

    const picked = answers[qitem.qitemId];
    if (typeof picked === "string" && qitem.branchMap[picked] !== undefined) {
      return qitem.branchMap[picked];
    }
  }
  return null;
}

/** '다음'을 눌렀을 때 갈 페이지 — 분기 목적지가 없으면 바로 다음 페이지 */
export function nextPageSeq(
  composition: QitemCpstCn,
  page: number,
  answers: RspnsCn,
): number {
  const lastPage = composition.pages.length - 1;
  const target = branchTargetOf(composition, page, answers) ?? page + 1;
  // 분기 대상은 구성 검증이 실재 여부를 보장하지만(#32), 범위를 벗어난 값에 화면이 죽지는 않게 한다
  return Math.min(lastPage, Math.max(0, target));
}

/**
 * 지금까지의 답으로 실제 도달하는 페이지 집합.
 *
 * 이미 지나온 페이지를 다시 만나면 그 자리에서 멈춘다 — 되돌아가는 분기는 구성 검증이 막지
 * 않아 순환하는 폼이 저장될 수 있는데, 순환한다는 것은 그 뒤로 새로 도달하는 페이지가 없다는
 * 뜻이라 필수 검사 대상도 늘지 않는다. (서버 `reachedPages`와 같은 종료 조건)
 */
export function reachedPageSeqs(composition: QitemCpstCn, answers: RspnsCn): Set<number> {
  const reached = new Set<number>();
  const lastPage = composition.pages.length - 1;
  if (lastPage < 0) return reached;

  let page = 0;
  for (let hop = 0; hop <= MAX_PAGE_HOPS; hop++) {
    if (page < 0 || page > lastPage || reached.has(page)) break;
    reached.add(page);
    if (page === lastPage) break;
    page = branchTargetOf(composition, page, answers) ?? page + 1;
  }
  return reached;
}

/* ── 서버로 보낼 본문 ───────────────────────────────────────── */

/**
 * 화면의 답 → `rspns_cn` 본문.
 *
 * 빈 값(`""`·`[]`)인 key는 싣지 않는다 — 서버도 저장하지 않으므로, 실어 보내면 저장 결과와
 * 보낸 값이 달라져 자동 저장이 "아직 안 저장됨"으로 계속 남는다.
 *
 * `reachedOnly`는 **제출에서만** 켠다. 응답자가 분기 A를 탔다가 되돌아가 B를 고르면 A에서 쓴
 * 답이 화면에 남는데, 그대로 제출하면 응답자가 보지도 않은 페이지의 답이 접수된다. 반대로
 * 자동 저장은 전부 싣는다 — 되돌아갔을 때 원래 쓰던 답이 복원돼야 하기 때문이다.
 * (도달 판정의 근거가 되는 분기 문항 자체는 언제나 도달한 페이지에 있으므로, 걸러 낸 뒤
 * 서버가 다시 계산하는 경로도 달라지지 않는다.)
 */
export function toRspnsCn(
  composition: QitemCpstCn,
  answers: RspnsCn,
  options: { reachedOnly?: boolean } = {},
): RspnsCn {
  const reached = options.reachedOnly ? reachedPageSeqs(composition, answers) : null;
  const body: RspnsCn = {};

  for (const qitem of composition.qitems) {
    if (reached && !reached.has(pageSeqOf(qitem))) continue;

    const kept = keptAnswerOf(qitem, answers[qitem.qitemId]);
    if (kept !== null) body[qitem.qitemId] = kept;
  }

  return body;
}

/* ── 제출 전 검증 ───────────────────────────────────────────── */

/**
 * 문항별 인라인 오류 — 서버(`ResponseAnswerValidator.validate`)와 같은 규칙을 먼저 본다.
 *
 * **자동 저장 경로에서는 부르지 않는다.** 작성 중에 필수가 비어 있고 형식이 어긋나 있는 것은
 * 정상이며, 여기서 걸면 다 채우기 전까지 아무것도 저장되지 않는다.
 *
 * `pageSeqs`에 든 페이지의 문항만 본다 — 분기로 건너뛴 페이지의 필수 문항은 필수가 아니다.
 */
export function validateAnswers(
  composition: QitemCpstCn,
  answers: RspnsCn,
  pageSeqs: Set<number>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const qitem of composition.qitems) {
    if (!pageSeqs.has(pageSeqOf(qitem))) continue;

    // 서버가 저장 대상으로 남기는 답만 본다 — 공백만 친 필수 문항은 서버에게 '답 없음'이다
    const kept = keptAnswerOf(qitem, answers[qitem.qitemId]);

    if (kept === null) {
      if (qitem.reqYn) errors[qitem.qitemId] = "필수 항목입니다";
      continue;
    }

    if (Array.isArray(kept)) {
      if (qitem.maxSlctCnt && kept.length > qitem.maxSlctCnt) {
        errors[qitem.qitemId] = `최대 ${qitem.maxSlctCnt}개까지 선택할 수 있습니다`;
      }
      continue;
    }

    if (isChoiceQitemType(qitem.qitemTypeCd)) continue;

    /*
     * 정규식은 텍스트형에만 건다(서버 TEXT_TYPES와 같다). 컴파일에 실패하는 정규식은 폼
     * 구성이 잘못된 것이지 응답자가 잘못한 것이 아니므로, 여기서 막지 않고 서버로 넘긴다.
     */
    if (isTextQitemType(qitem.qitemTypeCd) && qitem.ptrnCn) {
      try {
        // `.test()`는 서버의 `matcher().find()`와 같은 뜻이다 — 부분 일치를 허용한다
        if (!new RegExp(qitem.ptrnCn).test(kept)) {
          errors[qitem.qitemId] =
            qitem.ptrnMsgCn || `${qitem.ptrnNm || "형식"} 형식이 맞지 않습니다`;
        }
      } catch {
        // 잘못된 정규식 — 검사하지 않는다
      }
    }
  }

  return errors;
}

/** 한 페이지만 검증한다 ('다음' 버튼) */
export function validatePageAnswers(
  composition: QitemCpstCn,
  answers: RspnsCn,
  page: number,
): Record<string, string> {
  return validateAnswers(composition, answers, new Set([page]));
}
