import type { Qitem } from "@ssccops/form-renderer";

/*
 * 편집기가 들고 다니는 초안을 다루는 순수 함수들 (#528).
 *
 * 어드민 `features/form/model/form-draft.ts`에서 **필요한 둘만** 옮겨 왔다. 그쪽의
 * `FormDraft`·`toFormSaveInput`은 폼 제목·접수 기간·라벨·다중 응답까지 담는 모델인데, 이
 * 화면이 서버로 보내는 것은 문항 구성 하나라(서버가 그 밖을 받지 않는다) 담을 것이 없다 —
 * 초안은 `QitemCpstCn` 그 자체다.
 */

/**
 * 새 문항의 식별자.
 *
 * 개수가 아니라 **지금 쓰이는 번호의 최대값 + 1**이다. `q${length + 1}`이면 문항 3개
 * (q1·q2·q3)에서 q2를 지운 뒤 추가가 다시 q3이 되어 **살아 있는 문항과 겹친다.** qitemId는
 * 응답 내용(`rspns_cn`)의 key라, 겹친 채로 저장되면 서로 다른 질문의 답이 한 칸에 섞이고
 * 과거 응답을 어느 문항의 것으로 읽어야 할지 알 수 없다 — 되돌릴 수 없는 데이터 손상이다.
 *
 * `q1` 형태가 아닌 ID는 번호 계산에서 빼고, 그렇게 만든 후보가 그래도 겹치면 뒤로 민다.
 */
export function nextQitemId(qitems: Qitem[]): string {
  const used = new Set(qitems.map((q) => q.qitemId));

  let max = 0;
  for (const q of qitems) {
    const matched = /^q(\d+)$/.exec(q.qitemId);
    if (matched) max = Math.max(max, Number(matched[1]));
  }

  let candidate = `q${max + 1}`;
  for (let n = max + 2; used.has(candidate); n += 1) candidate = `q${n}`;
  return candidate;
}

/**
 * 최대 선택 개수 입력 파싱 결과.
 *
 * `Number(value) || undefined`로 읽으면 "0"도 "abc"도 조용히 «제한 없음»이 되어, 사용자는
 * 자기가 넣은 값이 사라진 것을 알 수 없다. 세 갈래를 구분해 호출부가 각각 다르게 반응하게
 * 한다 — 특히 invalid를 무시하지 않고 알린다.
 */
export type MaxSlctCntInput =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "invalid" };

/**
 * 범위 검사는 하지 않는다. 선택지 수보다 큰 값도 일단 초안에 담고 검증이 문구로 잡게 한다 —
 * 입력 순간에 되돌려 버리면 «선택지를 먼저 늘리고 오세요»를 전할 자리가 없다.
 */
export function parseMaxSlctCnt(raw: string): MaxSlctCntInput {
  const value = raw.trim();
  if (value === "") return { kind: "empty" };

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return { kind: "invalid" };
  return { kind: "number", value: parsed };
}

/** 정규식 입력란은 그 자리에서 컴파일해 본다 (빈 값은 «검증 없음»이라 정상) */
export function isCompilableRegExp(pattern: string | undefined): boolean {
  if (!pattern) return true;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * 입력 형식 프리셋 — 어드민 `shared/config/constants.ts`의 `PATTERN_PRESETS`와 같은 값이다.
 *
 * 두 앱이 같은 폼을 그리므로 프리셋이 갈리면 «어드민에서 고른 학번 형식»과 «여기서 고른
 * 학번 형식»이 다른 정규식이 된다.
 */
export const PATTERN_PRESETS = [
  { name: "자유 입력", pattern: "" },
  { name: "이메일", pattern: "^[^@\\s]+@[^@\\s]+\\.[a-zA-Z]{2,}$" },
  { name: "휴대전화", pattern: "^01[016-9]-[0-9]{3,4}-[0-9]{4}$" },
  { name: "숫자만", pattern: "^[0-9]+$" },
  { name: "학번(8자리)", pattern: "^[0-9]{8}$" },
] as const;
